import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const db = supabase as any;

const REASONS = ["Fake photo", "Harassment", "Inappropriate", "Other"];

const ReportDialog = ({
  reportedUserId,
  currentUserId,
  onClose,
}: {
  reportedUserId: string;
  currentUserId: string;
  onClose: () => void;
}) => {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason) return toast.error("Pick a reason");
    setSubmitting(true);
    try {
      const { error } = await db.from("partner_reports").insert({
        reporter_id: currentUserId,
        reported_id: reportedUserId,
        reason,
        details: details.trim() || null,
      });
      if (error) throw error;

      if (alsoBlock) {
        await db.from("partner_blocks").insert({
          blocker_id: currentUserId,
          blocked_id: reportedUserId,
        });
      }

      toast.success("Report submitted. Thank you.");
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Couldn't submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${
                  reason === r
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground/70"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Add details (optional)"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-foreground/70">
            <input
              type="checkbox"
              checked={alsoBlock}
              onChange={(e) => setAlsoBlock(e.target.checked)}
            />
            Also block this person
          </label>
          <Button className="w-full" onClick={submit} disabled={submitting}>
            Submit report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
