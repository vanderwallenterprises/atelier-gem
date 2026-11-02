"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canAct, requireAccount } from "@/lib/auth/session";
import { firstErrors, formValues, type FormState } from "@/lib/forms";
import {
  formToInput,
  isFormStep,
  listingSlug,
  livePriceStep,
  nextStep,
  stoneStep,
  STEP_SCHEMAS,
  submissionProblems,
  type FormStep,
} from "@/lib/domain/listing-wizard";
import { SELLER_TERMS_ERROR, SELLER_TERMS_VERSION, sellerOnboardingSchema, sellerSlug } from "@/lib/domain/seller-onboarding";
import { checkUpload, MAX_DOCUMENTS, MAX_PHOTOS } from "@/lib/domain/uploads";
import { getMyListing, getMySeller, listListingDocuments, listListingPhotos } from "@/lib/services/seller";
import { cleanPhoto } from "@/lib/images.server";
import { getSupabase } from "@/lib/supabase/server";

/*
 * Every action re-checks the signed-in account and ownership. RLS and the listing guard
 * trigger enforce the same rules in the database; these checks give clear messages first.
 */

const SUSPENDED: FormState = { error: "Your account is restricted, so listings can't be changed. Contact support for help." };

function dbMessage(error: { code?: string } | null, fallback: string): string {
  if (error?.code === "42501") return "This change isn't allowed for the listing in its current state.";
  if (error?.code === "23514") return "One of the values isn't allowed. Check the fields and try again.";
  return fallback;
}

function rand(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

async function sellerContext(next: string) {
  const account = await requireAccount(next);
  const seller = await getMySeller(account.id);
  return { account, seller };
}

// ----------------------------------------------------------------- onboarding

export async function becomeSeller(_prev: FormState, form: FormData): Promise<FormState> {
  const { account, seller } = await sellerContext("/onboarding/seller");
  if (seller) redirect("/seller");
  if (!canAct(account)) return SUSPENDED;
  const values = formValues(form);
  const parsed = sellerOnboardingSchema.safeParse(values);
  const termsError = form.get("terms") === "on" ? null : SELLER_TERMS_ERROR;
  if (!parsed.success || termsError) {
    const fieldErrors = parsed.success ? {} : firstErrors(parsed.error);
    if (termsError) fieldErrors.terms = termsError;
    return { fieldErrors, values };
  }

  const supabase = (await getSupabase())!;
  // The database sets a new seller capability to "pending"; an existing request is kept as is.
  const cap = await supabase.from("user_capabilities").insert({ user_id: account.id, capability: "seller" });
  if (cap.error && cap.error.code !== "23505") return { error: "Your seller request couldn't be saved. Try again.", values };

  const profile = parsed.data;
  const { error } = await supabase.from("seller_profiles").insert({
    ...profile,
    contact_email: profile.contact_email ?? account.email,
    user_id: account.id,
    slug: sellerSlug(profile.business_name, rand()),
    terms_version: SELLER_TERMS_VERSION,
  });
  if (error) {
    if (error.code === "42501") return { error: "Selling isn't available for this account. Contact support if that seems wrong.", values };
    return { error: "Your seller profile couldn't be saved. Check the details and try again.", values };
  }
  redirect("/seller?welcome=1");
}

// ------------------------------------------------------------------- listings

/** Ids arrive from bound form actions, which the client can replay with any value. */
function isId(id: unknown): id is string {
  return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function createListing(_prev: FormState, form: FormData): Promise<FormState> {
  const { account, seller } = await sellerContext("/seller/listings/new");
  if (!seller) redirect("/onboarding/seller");
  if (!canAct(account)) return SUSPENDED;
  const values = formValues(form);
  const parsed = stoneStep.safeParse(formToInput("stone", form));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const supabase = (await getSupabase())!;
  const { data, error } = await supabase
    .from("gemstone_listings")
    .insert({ ...parsed.data, seller_id: seller.id, slug: listingSlug(parsed.data.title, rand()), inventory_quantity: 1 })
    .select("id")
    .single();
  if (error || !data) return { error: dbMessage(error, "The draft couldn't be created. Try again."), values };
  revalidatePath("/seller");
  redirect(`/seller/listings/${data.id}?step=measurements`);
}

export async function saveListingStep(listingId: string, step: string, _prev: FormState, form: FormData): Promise<FormState> {
  if (!isId(listingId)) return { error: "This listing wasn't found in your account." };
  const { account } = await sellerContext(`/seller/listings/${listingId}`);
  if (!canAct(account)) return SUSPENDED;
  if (!isFormStep(step)) return { error: "That step can't be saved." };
  const listing = await getMyListing(listingId);
  if (!listing) return { error: "This listing wasn't found in your account." };
  if (listing.listing_status === "reserved" || listing.listing_status === "sold") {
    return { error: "Reserved or sold listings can't be edited." };
  }

  const values = formValues(form);
  // A live listing only changes its price here; anything else needs withdrawal and review.
  const live = listing.listing_status === "published";
  if (live && step !== "price") return { error: "Withdraw this listing from sale before changing its details." };
  const schema = live ? livePriceStep : STEP_SCHEMAS[step as FormStep];
  const parsed = schema.safeParse(formToInput(step, form));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const supabase = (await getSupabase())!;
  const { data, error } = await supabase.from("gemstone_listings").update(parsed.data).eq("id", listingId).select("id");
  if (error || !data?.length) return { error: dbMessage(error, "Your changes couldn't be saved. Try again."), values };

  revalidatePath(`/seller/listings/${listingId}`);
  revalidatePath("/seller");
  if (live) {
    revalidatePath(`/gemstones/${listing.slug}`);
    redirect("/seller?saved=1");
  }
  if (form.get("intent") === "exit") redirect("/seller?saved=1");
  redirect(`/seller/listings/${listingId}?step=${nextStep(step as FormStep)}`);
}

export async function submitListing(listingId: string): Promise<FormState> {
  if (!isId(listingId)) return { error: "This listing wasn't found in your account." };
  const { account } = await sellerContext(`/seller/listings/${listingId}?step=review`);
  if (!canAct(account)) return SUSPENDED;
  const listing = await getMyListing(listingId);
  if (!listing) return { error: "This listing wasn't found in your account." };
  if (listing.listing_status !== "draft" && listing.listing_status !== "withdrawn") {
    return { error: "Only drafts and withdrawn listings can be submitted." };
  }
  const photos = await listListingPhotos(listingId);
  const problems = submissionProblems(listing, photos.length);
  if (problems.length) return { error: `Finish these first: ${problems.map((p) => p.message).join(" ")}` };

  const supabase = (await getSupabase())!;
  const { data, error } = await supabase
    .from("gemstone_listings")
    .update({ listing_status: "submitted" })
    .eq("id", listingId)
    .select("id");
  if (error || !data?.length) return { error: dbMessage(error, "The listing couldn't be submitted. Try again.") };
  revalidatePath("/seller");
  redirect("/seller?submitted=1");
}

/** Takes a listing off the marketplace (or out of review) so it can be edited. */
export async function withdrawListing(listingId: string): Promise<void> {
  if (!isId(listingId)) redirect("/seller?error=withdraw");
  const { account } = await sellerContext("/seller");
  if (!canAct(account)) redirect("/seller?error=restricted");
  const supabase = (await getSupabase())!;
  const { data, error } = await supabase
    .from("gemstone_listings")
    .update({ listing_status: "withdrawn" })
    .eq("id", listingId)
    .in("listing_status", ["submitted", "published"])
    .select("slug");
  revalidatePath("/seller");
  if (error || !data?.length) redirect("/seller?error=withdraw");
  revalidatePath(`/gemstones/${data[0].slug}`);
  redirect(`/seller/listings/${listingId}?step=review`);
}

/**
 * Deletes a never-submitted draft. Files go first: the storage policies look the listing up,
 * so once its row is gone they could no longer be removed.
 */
export async function deleteDraft(listingId: string): Promise<void> {
  if (!isId(listingId)) redirect("/seller?error=delete");
  const { account } = await sellerContext("/seller");
  if (!canAct(account)) redirect("/seller?error=restricted");
  const listing = await getMyListing(listingId);
  if (!listing || listing.listing_status !== "draft") redirect("/seller?error=delete");

  const supabase = (await getSupabase())!;
  const [photos, docs] = await Promise.all([listListingPhotos(listingId), listListingDocuments(listingId)]);
  const removals = await Promise.all([
    photos.length ? supabase.storage.from("listing-photos").remove(photos.map((p) => p.storage_path)) : null,
    docs.length ? supabase.storage.from("listing-documents").remove(docs.map((d) => d.storage_path)) : null,
  ]);
  const removed = removals.reduce((n, r) => n + (r?.data?.length ?? 0), 0);
  if (removals.some((r) => r?.error) || removed < photos.length + docs.length) redirect("/seller?error=delete-files");

  const { data } = await supabase.from("gemstone_listings").delete().eq("id", listingId).eq("listing_status", "draft").select("id");
  revalidatePath("/seller");
  redirect(data?.length ? "/seller?deleted=1" : "/seller?error=delete");
}

// --------------------------------------------------------------------- files

const FILE_EDITABLE: readonly string[] = ["draft", "submitted", "withdrawn"];

async function readUpload(form: FormData, kind: "photo" | "document") {
  const file = form.get("file");
  if (!(file instanceof File)) return { ok: false as const, message: "Choose a file to upload." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkUpload({ size: file.size, head: bytes.subarray(0, 16) }, kind);
  return check.ok ? { ok: true as const, bytes, type: check.type } : check;
}

async function editableListing(listingId: string) {
  if (!isId(listingId)) return { error: "This listing wasn't found in your account." };
  const listing = await getMyListing(listingId);
  if (!listing) return { error: "This listing wasn't found in your account." };
  if (!FILE_EDITABLE.includes(listing.listing_status)) {
    return { error: "Photos and documents can be changed after you withdraw the listing from sale." };
  }
  return { listing };
}

export async function uploadPhoto(listingId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { error: notEditable } = await editableListing(listingId);
  if (notEditable) return { error: notEditable };
  const { account } = await sellerContext(`/seller/listings/${listingId}?step=photos`);
  if (!canAct(account)) return SUSPENDED;
  const photos = await listListingPhotos(listingId);
  if (photos.length >= MAX_PHOTOS) return { error: `A listing can have up to ${MAX_PHOTOS} photos. Remove one first.` };

  const upload = await readUpload(form, "photo");
  if (!upload.ok) return { fieldErrors: { file: upload.message } };
  // Re-encoding strips location and camera data before the photo becomes public.
  const clean = await cleanPhoto(upload.bytes, upload.type);
  if (!clean) return { fieldErrors: { file: "That file couldn't be read as a photo. Try exporting it again as JPEG." } };

  const supabase = (await getSupabase())!;
  const path = `${listingId}/${crypto.randomUUID()}.${upload.type.ext}`;
  const stored = await supabase.storage.from("listing-photos").upload(path, clean, { contentType: upload.type.mime, upsert: false });
  if (stored.error) return { error: "The photo couldn't be uploaded. Try again." };

  const { error } = await supabase.from("gemstone_images").insert({
    listing_id: listingId,
    storage_path: path,
    media_type: "image",
    is_primary: photos.length === 0,
    display_order: Math.min(photos.length, 50),
  });
  if (error) {
    await supabase.storage.from("listing-photos").remove([path]);
    return { error: dbMessage(error, "The photo couldn't be saved. Try again.") };
  }
  revalidatePath(`/seller/listings/${listingId}`);
  return { message: "Photo added." };
}

export async function removePhoto(listingId: string, photoId: string): Promise<void> {
  if (!isId(listingId) || !isId(photoId)) redirect("/seller");
  const back = `/seller/listings/${listingId}?step=photos`;
  const { account } = await sellerContext(back);
  if (!canAct(account)) redirect("/seller?error=restricted");
  const supabase = (await getSupabase())!;
  const { data: photo } = await supabase.from("gemstone_images").select("storage_path, is_primary").eq("id", photoId).eq("listing_id", listingId).maybeSingle();
  if (!photo) redirect(`${back}&error=photo`);
  // Storage first, while the listing still proves who owns the file.
  const file = await supabase.storage.from("listing-photos").remove([photo.storage_path]);
  const { data } = file.error ? { data: null } : await supabase.from("gemstone_images").delete().eq("id", photoId).select("id");
  if (!data?.length) redirect(`${back}&error=photo`);
  if (photo.is_primary) {
    const [first] = await listListingPhotos(listingId);
    if (first) await supabase.from("gemstone_images").update({ is_primary: true }).eq("id", first.id);
  }
  revalidatePath(`/seller/listings/${listingId}`);
  redirect(back);
}

export async function makePrimaryPhoto(listingId: string, photoId: string): Promise<void> {
  if (!isId(listingId) || !isId(photoId)) redirect("/seller");
  const back = `/seller/listings/${listingId}?step=photos`;
  const { account } = await sellerContext(back);
  if (!canAct(account)) redirect("/seller?error=restricted");
  const supabase = (await getSupabase())!;
  const { data } = await supabase.from("gemstone_images").select("id").eq("id", photoId).eq("listing_id", listingId).maybeSingle();
  if (!data) redirect(`${back}&error=photo`);
  const cleared = await supabase.from("gemstone_images").update({ is_primary: false }).eq("listing_id", listingId).neq("id", photoId);
  const set = await supabase.from("gemstone_images").update({ is_primary: true }).eq("id", photoId).select("id");
  revalidatePath(`/seller/listings/${listingId}`);
  redirect(cleared.error || set.error || !set.data?.length ? `${back}&error=photo` : back);
}

export async function uploadReportDocument(listingId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { error: notEditable } = await editableListing(listingId);
  if (notEditable) return { error: notEditable };
  const { account } = await sellerContext(`/seller/listings/${listingId}?step=report`);
  if (!canAct(account)) return SUSPENDED;
  const docs = await listListingDocuments(listingId);
  if (docs.length >= MAX_DOCUMENTS) return { error: `A listing can have up to ${MAX_DOCUMENTS} documents. Remove one first.` };

  const upload = await readUpload(form, "document");
  if (!upload.ok) return { fieldErrors: { file: upload.message } };

  const supabase = (await getSupabase())!;
  const path = `${listingId}/${crypto.randomUUID()}.${upload.type.ext}`;
  const stored = await supabase.storage.from("listing-documents").upload(path, upload.bytes, { contentType: upload.type.mime, upsert: false });
  if (stored.error) return { error: "The document couldn't be uploaded. Try again." };

  const { error } = await supabase.from("listing_documents").insert({
    listing_id: listingId,
    kind: "grading_report",
    storage_path: path,
    original_media_type: upload.type.mime,
  });
  if (error) {
    await supabase.storage.from("listing-documents").remove([path]);
    return { error: dbMessage(error, "The document couldn't be saved. Try again.") };
  }
  revalidatePath(`/seller/listings/${listingId}`);
  return { message: "Report document added. Only you and marketplace reviewers can open it." };
}

export async function removeDocument(listingId: string, documentId: string): Promise<void> {
  if (!isId(listingId) || !isId(documentId)) redirect("/seller");
  const back = `/seller/listings/${listingId}?step=report`;
  const { account } = await sellerContext(back);
  if (!canAct(account)) redirect("/seller?error=restricted");
  const supabase = (await getSupabase())!;
  const { data: doc } = await supabase.from("listing_documents").select("storage_path").eq("id", documentId).eq("listing_id", listingId).maybeSingle();
  if (!doc) redirect(`${back}&error=document`);
  // Storage first, while the row still proves which listing the file belongs to.
  const file = await supabase.storage.from("listing-documents").remove([doc.storage_path]);
  const { data } = file.error ? { data: null } : await supabase.from("listing_documents").delete().eq("id", documentId).select("id");
  revalidatePath(`/seller/listings/${listingId}`);
  redirect(data?.length ? back : `${back}&error=document`);
}
