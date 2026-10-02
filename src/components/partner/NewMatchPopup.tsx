import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { InboxMatch } from "@/hooks/usePartnerInbox";

const NewMatchPopup = ({
  match,
  onSayHi,
  onKeepSwiping,
}: {
  match: InboxMatch;
  onSayHi: () => void;
  onKeepSwiping: () => void;
}) => {
  const name = match.other?.display_name ?? "Someone";
  const photo = match.other?.photo_urls?.[0];

  return (
    <Dialog open onOpenChange={onKeepSwiping}>
      <DialogContent className="max-w-sm text-center">
        <div className="py-2 space-y-4">
          <p className="font-display text-2xl text-gradient-brand">It's a match! 🎉</p>
          {photo && (
            <img
              src={photo}
              alt=""
              className="w-28 h-28 rounded-full object-cover mx-auto border-4 border-primary/30"
            />
          )}
          <p className="text-foreground/80">
            You and <span className="font-semibold">{name}</span> both swiped right.
            You've got 10 minutes to chat before it closes — make it count!
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onKeepSwiping}>
              Keep swiping
            </Button>
            <Button className="flex-1" onClick={onSayHi}>
              Say hi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewMatchPopup;
