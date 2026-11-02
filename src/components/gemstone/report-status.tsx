import { BadgeCheck, CircleDashed, CircleAlert, FileQuestion } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { GRADING_LABS, type GradingLab, type VerificationStatus } from "@/lib/domain/gemstone";

/**
 * One line that says exactly what is known about a stone's grading report.
 * "Verified" only appears for the verified state; everything else is described plainly.
 */
export function ReportStatus({ lab, status, compact = false }: { lab: GradingLab; status: VerificationStatus; compact?: boolean }) {
  if (lab === "none") {
    return <Badge tone="outline">No grading report</Badge>;
  }
  const labName = GRADING_LABS[lab];
  switch (status) {
    case "verified":
      return (
        <Badge tone="success">
          <BadgeCheck className="size-3.5" aria-hidden /> {labName} report verified
        </Badge>
      );
    case "submitted":
    case "pending_review":
      return (
        <Badge tone="neutral">
          <CircleDashed className="size-3.5" aria-hidden /> {labName} report{compact ? "" : ", verification pending"}
        </Badge>
      );
    case "unable_to_verify":
    case "recheck_required":
      return (
        <Badge tone="warning">
          <FileQuestion className="size-3.5" aria-hidden /> {labName} report not verified
        </Badge>
      );
    case "rejected":
      return (
        <Badge tone="danger">
          <CircleAlert className="size-3.5" aria-hidden /> {labName} report rejected
        </Badge>
      );
    default:
      return <Badge tone="outline">{labName} report, seller-stated</Badge>;
  }
}
