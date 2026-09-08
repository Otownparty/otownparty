import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  LogOut,
  RefreshCw,
  Copy,
  Check,
  Ticket,
  Store,
  Search,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  History,
  ArrowLeft,
  Mail,
  Send,

} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const CURRENT_EDITION = "Otown Party 14.0 - Ede Edition";
const PAST_EDITIONS: { value: string; label: string; date: string }[] = [
  {
    value: "Otown Party 13.0 - Faaji Extra",
    label: "Otown Party 13.0",
    date: "Faaji Extra · August 2026",
  },
  {
    value: "Otown Party 12.0 - Iseyin Edition",
    label: "Otown Party 12.0",
    date: "Iseyin Edition · June 2026",
  },
  {
    value: "Otown Party 11.0 - Glow in the 90s",
    label: "Otown Party 11.0",
    date: "Glow in the 90s · May 2026",
  },
];

type TicketStats = {
  ticketType: string;
  bought: number;
  scanned: number;
};

type BuyerRecord = {
  name: string;
  email: string;
  ticketType: string;
  quantity: number;
  claimedAt: string;
  edition: string;
};

interface TicketPurchaseRecord {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone: string;
  ticket_type: string;
  quantity: number;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  edition: string;
}

interface VendorRecord {
  id: string;
  reference: string;
  brand_name: string;
  brand_description: string;
  instagram: string;
  city: string;
  phone: string;
  email: string;
  previous_vendor: string;
  business_category: string;
  sub_category: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  scanned: boolean;
  scanned_at: string | null;
  scanned_by: string | null;
  edition: string;
}

interface VendorRecord {
  id: string;
  reference: string;
  brand_name: string;
  brand_description: string;
  instagram: string;
  city: string;
  phone: string;
  email: string;
  previous_vendor: string;
  business_category: string;
  sub_category: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  scanned: boolean;
  scanned_at: string | null;
  scanned_by: string | null;
}

const TICKET_TYPES = ["Early Bird", "Regular", "VIP Experience"];

type RawTicket = {
  ticket_type: string;
  used: boolean;
  edition: string | null;
  buyer_email: string | null;
  used_by: string | null;
  used_at: string | null;
};

type StaffAccount = {
  userId: string;
  role: string;
  username: string;
  createdAt: string;
};


const Record = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);

  // Original ticket stats state
  const [loading, setLoading] = useState(true);
  const [rawTickets, setRawTickets] = useState<RawTicket[]>([]);
  const [buyers, setBuyers] = useState<BuyerRecord[]>([]);
  const [copied, setCopied] = useState(false);
  const [copiedVendors, setCopiedVendors] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [confirmClear, setConfirmClear] = useState<null | "tickets" | "vendors">(null);
  const [clearing, setClearing] = useState(false);

  // Party reminder email state
  const DEFAULT_REMINDER_SUBJECT = "🚨 TONIGHT: Otown Party 14.0 — Ede Edition. Here's your gate guide";
  const DEFAULT_REMINDER_MESSAGE = `Hey Raver,

Today is the day. 🔥 Otown Party 14.0: Ede Edition takes over Ideal Hotels and Bar, Ede TONIGHT.

📅 Today — Saturday, 5th September 2026
🕕 Gates open 6PM · Music till 4AM
📍 Ideal Hotels and Bar, Agbale Area, Ede, Osun State

HOW TO GET IN — READ THIS BEFORE YOU LEAVE HOME

1. Find your QR code. It was emailed to this exact address when you bought your ticket (subject line mentions your Otown Party ticket). Search your inbox for "Otown Party" — check Spam/Promotions too.
2. Save it offline. Screenshot the QR code or download the attached PNG to your gallery. Network at the venue can be slow — don't rely on opening an email at the gate.
3. Turn your screen brightness UP. A dim or cracked screen slows the scanner down. A clean printed copy works perfectly too.
4. At the gate, go to the TICKET SCAN STAND. Hold your QR code flat and steady about 20–30cm from the scanner. Our staff scans it, it turns green, and you're in.
5. One scan per ticket. Each QR is unique and works ONCE. If you bought multiple tickets, each guest needs their own QR — don't share or post it online, whoever scans it first gets the entry.
6. Bring a valid ID that matches the name on your ticket, in case we need to verify.
7. Any issue at the gate? Don't queue twice — step aside to the support desk beside the scan stand with your payment reference and we'll sort you out in seconds.

TO MAKE TONIGHT LEGENDARY

• Arrive early — 6PM to 8PM is the smoothest entry window, and the opening set is worth it.
• Dress the part. The Ede Edition is a whole mood — come in your freshest fit.
• Move with your squad. The energy is always bigger with your people.
• Stay hydrated, pace the drinks, and look out for each other.
• Vendors, food, drinks and shisha are all on ground — come with cash and transfer ready.

Sound system loaded. DJ lineup ready. Lights set. Only one thing missing — you. 🌀

See you on the dancefloor tonight.

— The Otown Party Team`;

  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderSubject, setReminderSubject] = useState(DEFAULT_REMINDER_SUBJECT);
  const [reminderMessage, setReminderMessage] = useState(DEFAULT_REMINDER_MESSAGE);
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderCount, setReminderCount] = useState<number | null>(null);
  const [reminderResult, setReminderResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [reminderAudience, setReminderAudience] = useState<"edition" | "all" | "manual">("edition");
  const [manualEmails, setManualEmails] = useState("");

  // Edition selector + history
  const [selectedEdition, setSelectedEdition] = useState<string>(CURRENT_EDITION);
  const [historyOpen, setHistoryOpen] = useState(false);


  // New tabbed records state
  const [activeTab, setActiveTab] = useState("overview");
  const [ticketSearch, setTicketSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [ticketPurchases, setTicketPurchases] = useState<TicketPurchaseRecord[]>([]);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(false);

  // Scanner accounts (admin only)
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [staffBusy, setStaffBusy] = useState(false);

  const loadStaff = async () => {
    setStaffLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-staff", {
      body: { action: "list" },
    });
    if (error) toast.error("Could not load staff accounts");
    else setStaff((data?.staff as StaffAccount[]) || []);
    setStaffLoading(false);
  };

  const createScanner = async () => {
    if (!newUsername.trim() || newPassword.length < 6) {
      toast.error("Enter a username and a password of at least 6 characters");
      return;
    }
    setStaffBusy(true);
    const { data, error } = await supabase.functions.invoke("manage-staff", {
      body: { action: "create", username: newUsername, password: newPassword },
    });
    setStaffBusy(false);
    if (error || data?.error) {
      toast.error(data?.error || "Could not create that login");
      return;
    }
    toast.success(`Scanner login "${data.username}" created`);
    setNewUsername("");
    setNewPassword("");
    loadStaff();
  };

  const removeScanner = async (userId: string, username: string) => {
    setStaffBusy(true);
    const { data, error } = await supabase.functions.invoke("manage-staff", {
      body: { action: "delete", userId },
    });
    setStaffBusy(false);
    if (error || data?.error) {
      toast.error(data?.error || "Could not remove that login");
      return;
    }
    toast.success(`${username} removed`);
    loadStaff();
  };

  const resetScannerPassword = async (userId: string, username: string) => {
    const pwd = window.prompt(`New password for ${username} (min 6 characters)`);
    if (!pwd) return;
    setStaffBusy(true);
    const { data, error } = await supabase.functions.invoke("manage-staff", {
      body: { action: "reset_password", userId, password: pwd },
    });
    setStaffBusy(false);
    if (error || data?.error) {
      toast.error(data?.error || "Could not update the password");
      return;
    }
    toast.success(`Password updated for ${username}`);
  };


  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate("/staff?next=/record", { replace: true });
        return;
      }
      // Only admins may view records. Gate-scanner accounts go to the scanner.
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      if (!isAdmin) {
        navigate("/scan", { replace: true });
        return;
      }
      setAuthChecked(true);
      fetchAllData();
    });
  }, [navigate]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchTicketStats(), fetchTicketPurchases(), fetchVendors(), loadStaff()]);
    setLoading(false);
  };

  const fetchTicketStats = async () => {
    try {
      const { data: tickets, error: ticketsErr } = await supabase
        .from("tickets")
        .select("ticket_type, used, edition, buyer_email, used_by, used_at")
        .order("ticket_type");

      if (ticketsErr) throw ticketsErr;
      setRawTickets((tickets as RawTicket[]) || []);

      // Fetch buyer records from payment_intents
      const { data: intents, error: intentsErr } = await supabase
        .from("payment_intents")
        .select("buyer_name, buyer_email, ticket_type, quantity, claimed_at, edition")
        .eq("status", "claimed")
        .order("claimed_at", { ascending: false });

      if (intentsErr) throw intentsErr;

      const buyerArr: BuyerRecord[] = (intents || []).map((i) => ({
        name: i.buyer_name || "—",
        email: i.buyer_email || "—",
        ticketType: i.ticket_type,
        quantity: i.quantity,
        edition: i.edition || CURRENT_EDITION,
        claimedAt: i.claimed_at
          ? new Date(i.claimed_at).toLocaleDateString("en-NG", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—",
      }));

      setBuyers(buyerArr);
      setLastUpdated(new Date());
    } catch (err) {
      toast.error((err as Error).message);
    }
  };


  const fetchTicketPurchases = async () => {
    setLoadingTickets(true);
    const { data, error } = await supabase
      .from("ticket_purchases")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load ticket purchases");
    } else {
      setTicketPurchases(data || []);
    }
    setLoadingTickets(false);
  };

  const fetchVendors = async () => {
    setLoadingVendors(true);
    const { data, error } = await supabase
      .from("vendor_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load vendors");
    } else {
      setVendors(data || []);
    }
    setLoadingVendors(false);
  };

  const copyEmails = () => {
    const emails = editionBuyers.map((b) => b.email).join(", ");
    navigator.clipboard.writeText(emails).then(() => {
      setCopied(true);
      toast.success("All emails copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const copyVendorEmails = () => {
    const emails = filteredVendors.map((v) => v.email).filter(Boolean).join(", ");
    if (!emails) return toast.error("No vendor emails to copy");
    navigator.clipboard.writeText(emails).then(() => {
      setCopiedVendors(true);
      toast.success("All vendor emails copied!");
      setTimeout(() => setCopiedVendors(false), 2500);
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/staff");
  };

  const clearAll = async (type: "tickets" | "vendors") => {
    setClearing(true);
    try {
      if (type === "tickets") {
        const { error: e1 } = await supabase
          .from("tickets")
          .delete()
          .not("id", "is", null);
        if (e1) throw e1;
        const { error: e2 } = await supabase
          .from("ticket_purchases")
          .delete()
          .not("id", "is", null);
        if (e2) throw e2;
        const { error: e3 } = await supabase
          .from("payment_intents")
          .delete()
          .not("id", "is", null);
        if (e3) throw e3;
        toast.success("Ticket records cleared");
      } else {
        const { error } = await supabase
          .from("vendor_applications")
          .delete()
          .not("id", "is", null);
        if (error) throw error;
        toast.success("Vendor records cleared");
      }
      await fetchAllData();
    } catch (err) {
      toast.error((err as Error).message || "Failed to clear records");
    } finally {
      setClearing(false);
      setConfirmClear(null);
    }
  };

  const parseManualEmails = (raw: string) =>
    raw
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  const reminderPayload = (extra: Record<string, unknown> = {}) => ({
    edition: selectedEdition,
    audience: reminderAudience,
    recipients: parseManualEmails(manualEmails),
    ...extra,
  });

  const loadReminderPreview = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("send-party-reminder", {
        body: reminderPayload({ dryRun: true }),
      });
      if (error) throw error;
      setReminderCount((data as any)?.count ?? 0);
    } catch (err) {
      console.error("preview failed", err);
      setReminderCount(null);
      toast.error("Could not load recipient count");
    }
  };

  const openReminder = async () => {
    setReminderResult(null);
    setReminderCount(null);
    setReminderOpen(true);
    await loadReminderPreview();
  };

  useEffect(() => {
    if (!reminderOpen) return;
    setReminderCount(null);
    const t = setTimeout(() => { loadReminderPreview(); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminderAudience, manualEmails, selectedEdition, reminderOpen]);

  const sendReminder = async () => {
    if (!reminderSubject.trim() || !reminderMessage.trim()) {
      return toast.error("Subject and message are required");
    }
    if (reminderAudience === "manual" && parseManualEmails(manualEmails).length === 0) {
      return toast.error("Add at least one valid email address");
    }
    setReminderSending(true);
    setReminderResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-party-reminder", {
        body: reminderPayload({
          subject: reminderSubject,
          message: reminderMessage,
        }),
      });
      if (error) throw error;
      const res = data as { sent: number; failed: number; total: number };
      setReminderResult(res);
      toast.success(`Sent ${res.sent} of ${res.total} reminder emails${res.failed ? ` (${res.failed} failed)` : ""}`);
    } catch (err) {
      toast.error((err as Error).message || "Failed to send reminder");
    } finally {
      setReminderSending(false);
    }
  };



  const exportCSV = (type: "tickets" | "vendors") => {
    const data = type === "tickets" ? filteredTicketPurchases : filteredVendors;
    if (data.length === 0) return toast.error("No data to export");

    const headers =
      type === "tickets"
        ? ["Reference", "Name", "Email", "Phone", "Ticket Type", "Quantity", "Amount (NGN)", "Status", "Paid At", "Created At"]
        : ["Reference", "Brand Name", "Email", "Phone", "Category", "Sub Category", "Previous Vendor", "Instagram", "City", "Amount (NGN)", "Status", "Paid At", "Created At"];

    const rows =
      type === "tickets"
        ? data.map((t) => [
            t.reference,
            t.name,
            t.email,
            t.phone,
            t.ticket_type,
            t.quantity,
            t.amount / 100,
            t.status,
            t.paid_at || "N/A",
            t.created_at,
          ])
        : data.map((v) => [
            v.reference,
            v.brand_name,
            v.email,
            v.phone,
            v.business_category,
            v.sub_category,
            v.previous_vendor,
            v.instagram,
            v.city,
            v.amount / 100,
            v.status,
            v.paid_at || "N/A",
            v.created_at,
          ]);

    const csv = [headers, ...rows].map((r) => r.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `otown-${type}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${type} exported successfully`);
  };

  const getStatusBadge = (status: string) => {
    if (status === "paid")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
          <CheckCircle2 size={12} /> Paid
        </span>
      );
    if (status === "pending")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium">
          <Clock size={12} /> Pending
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-medium">
        <XCircle size={12} /> {status}
      </span>
    );
  };

  // Derive stats filtered by selected edition
  const editionTickets = rawTickets.filter(
    (t) => (t.edition || CURRENT_EDITION) === selectedEdition
  );
  const stats: TicketStats[] = TICKET_TYPES.map((type) => {
    const sub = editionTickets.filter((t) => t.ticket_type === type);
    return {
      ticketType: type,
      bought: sub.length,
      scanned: sub.filter((t) => t.used).length,
    };
  });
  const totalBought = stats.reduce((sum, s) => sum + s.bought, 0);
  const totalScanned = stats.reduce((sum, s) => sum + s.scanned, 0);

  const editionBuyers = buyers.filter((b) => b.edition === selectedEdition);

  // Who scanned each buyer's ticket, keyed by buyer email
  const scanInfoByEmail = new Map<string, { by: string; at: string | null }>();
  editionTickets.forEach((t) => {
    if (t.used && t.buyer_email && t.used_by) {
      const key = t.buyer_email.toLowerCase();
      if (!scanInfoByEmail.has(key)) {
        scanInfoByEmail.set(key, { by: t.used_by, at: t.used_at });
      }
    }
  });


  const filteredTicketPurchases = ticketPurchases
    .filter((t) => (t.edition || CURRENT_EDITION) === selectedEdition)
    .filter((t) =>
      [t.name, t.email, t.reference, t.ticket_type].some((field) =>
        field?.toLowerCase().includes(ticketSearch.toLowerCase())
      )
    );

  const filteredVendors = vendors
    .filter((v) => (v.edition || CURRENT_EDITION) === selectedEdition)
    .filter((v) =>
      [v.brand_name, v.email, v.reference, v.business_category, v.sub_category, v.instagram].some((field) =>
        field?.toLowerCase().includes(vendorSearch.toLowerCase())
      )
    );

  const isViewingHistory = selectedEdition !== CURRENT_EDITION;
  const currentEditionLabel =
    PAST_EDITIONS.find((e) => e.value === selectedEdition)?.label ||
    selectedEdition;

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="text-primary text-xs font-semibold uppercase tracking-widest mb-1">
              {isViewingHistory ? `History · ${currentEditionLabel}` : "Otown Party 12.0 · Current Edition"}
            </p>
            <h1 className="font-display font-bold text-2xl text-foreground">
              {isViewingHistory ? "Past Edition Records" : "Ticket Records"}
            </h1>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {lastUpdated.toLocaleTimeString("en-NG")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={openReminder}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 transition"
            >
              <Mail size={12} />
              Email Buyers
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 text-xs font-semibold transition"
            >
              <History size={12} />
              History
            </button>
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary text-xs font-semibold transition disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition"
            >
              <LogOut size={12} /> Sign out
            </button>
          </div>
        </div>

        {isViewingHistory && (
          <div className="mb-6 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/30">
            <div className="text-sm">
              <span className="text-muted-foreground">Viewing past edition:</span>{" "}
              <span className="font-semibold text-primary">{selectedEdition}</span>
            </div>
            <button
              onClick={() => setSelectedEdition(CURRENT_EDITION)}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
            >
              <ArrowLeft size={12} /> Back to current edition
            </button>
          </div>
        )}


        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="overview" className="gap-2">
                <Ticket size={16} />
                Ticket Purchases
              </TabsTrigger>
              <TabsTrigger value="vendors" className="gap-2">
                <Store size={16} />
                Vendors
                <span className="ml-1 text-xs text-muted-foreground">({vendors.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB (Original Functionality) */}
            <TabsContent value="overview">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-3xl font-display font-bold text-primary">{totalBought}</p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Total Sold</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-3xl font-display font-bold text-green-400">{totalScanned}</p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Total Scanned</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-3xl font-display font-bold text-foreground">
                    {totalBought - totalScanned}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Not Yet Scanned</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-3xl font-display font-bold text-primary">
                    {totalBought > 0 ? Math.round((totalScanned / totalBought) * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Attendance Rate</p>
                </div>
              </div>

              {/* Tickets Table */}
              <div className="bg-card border border-border rounded-xl overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="font-display font-bold text-lg text-foreground">
                    Tickets by Type
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Ticket Type
                        </th>
                        <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Sold
                        </th>
                        <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Scanned
                        </th>
                        <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Remaining
                        </th>
                        <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Scan Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((s, i) => (
                        <tr
                          key={s.ticketType}
                          className={`border-b border-border last:border-0 ${
                            i % 2 === 0 ? "bg-background" : "bg-card"
                          }`}
                        >
                          <td className="px-6 py-4 font-semibold text-foreground">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  s.ticketType === "Early Bird"
                                    ? "bg-primary"
                                    : s.ticketType === "Regular"
                                    ? "bg-blue-400"
                                    : "bg-pink-400"
                                }`}
                              />
                              {s.ticketType}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-bold text-foreground text-base">{s.bought}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-bold text-green-400 text-base">{s.scanned}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-bold text-muted-foreground text-base">
                              {s.bought - s.scanned}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                s.bought === 0
                                  ? "bg-muted text-muted-foreground"
                                  : s.scanned / s.bought >= 0.8
                                  ? "bg-green-500/15 text-green-400"
                                  : s.scanned / s.bought >= 0.5
                                  ? "bg-yellow-500/15 text-yellow-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {s.bought > 0
                                ? Math.round((s.scanned / s.bought) * 100)
                                : 0}%
                            </span>
                          </td>
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr className="bg-primary/5 border-t-2 border-primary/20">
                        <td className="px-6 py-4 font-bold text-foreground uppercase text-xs tracking-wide">
                          Total
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-primary text-base">
                          {totalBought}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-green-400 text-base">
                          {totalScanned}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-muted-foreground text-base">
                          {totalBought - totalScanned}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-primary/15 text-primary">
                            {totalBought > 0
                              ? Math.round((totalScanned / totalBought) * 100)
                              : 0}%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Buyer Records */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="font-display font-bold text-lg text-foreground">
                      Buyer Records
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {editionBuyers.length} ticket{editionBuyers.length !== 1 ? "s" : ""} purchased
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={copyEmails}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/20 transition"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? "Copied!" : "Copy All Emails"}
                    </button>
                    <button
                      onClick={() => exportCSV("tickets")}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 transition"
                    >
                      <Download size={12} /> Export
                    </button>
                    <button
                      onClick={() => setConfirmClear("tickets")}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold hover:bg-red-500/20 transition"
                    >
                      <Trash2 size={12} /> Clear All
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  {editionBuyers.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      No tickets purchased yet.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Name
                          </th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Email
                          </th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Type
                          </th>
                          <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Qty
                          </th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Date
                          </th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Scanned By
                          </th>

                        </tr>
                      </thead>
                      <tbody>
                        {editionBuyers.map((b, i) => (
                          <tr
                            key={i}
                            className={`border-b border-border last:border-0 ${
                              i % 2 === 0 ? "bg-background" : "bg-card"
                            }`}
                          >
                            <td className="px-6 py-3.5 font-medium text-foreground">
                              {b.name}
                            </td>
                            <td className="px-6 py-3.5 text-muted-foreground">
                              {b.email}
                            </td>
                            <td className="px-6 py-3.5">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  b.ticketType === "Early Bird"
                                    ? "bg-primary/15 text-primary"
                                    : b.ticketType === "Regular"
                                    ? "bg-blue-400/15 text-blue-400"
                                    : "bg-pink-400/15 text-pink-400"
                                }`}
                              >
                                {b.ticketType}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-center text-foreground font-semibold">
                              {b.quantity}
                            </td>
                            <td className="px-6 py-3.5 text-muted-foreground text-xs">
                              {b.claimedAt}
                            </td>
                            <td className="px-6 py-3.5 text-xs">
                              {(() => {
                                const info = scanInfoByEmail.get(b.email?.toLowerCase() || "");
                                return info ? (
                                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-green-400/15 text-green-400 font-bold">
                                    {info.by}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                );
                              })()}
                            </td>

                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* VENDORS TAB */}
            <TabsContent value="vendors">
              {/* Vendor Summary Cards */}
              {(() => {
                const paidVendors = vendors.filter((v) => v.status === "paid");
                const totalVendors = paidVendors.length;
                const scannedVendors = paidVendors.filter((v) => v.scanned).length;
                const remaining = totalVendors - scannedVendors;
                const rate = totalVendors > 0 ? Math.round((scannedVendors / totalVendors) * 100) : 0;
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                      <p className="text-3xl font-display font-bold text-primary">{totalVendors}</p>
                      <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Paid Vendors</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                      <p className="text-3xl font-display font-bold text-green-400">{scannedVendors}</p>
                      <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Checked In</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                      <p className="text-3xl font-display font-bold text-foreground">{remaining}</p>
                      <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Not Yet Scanned</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                      <p className="text-3xl font-display font-bold text-primary">{rate}%</p>
                      <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Check-in Rate</p>
                    </div>
                  </div>
                );
              })()}

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    type="text"
                    placeholder="Search vendors by brand, email, category, Instagram..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={fetchVendors}
                    className="px-4 py-3 rounded-lg border border-border hover:bg-muted transition"
                  >
                    <RefreshCw size={16} className={loadingVendors ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={copyVendorEmails}
                    className="px-4 py-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/20 transition flex items-center gap-2"
                  >
                    {copiedVendors ? <Check size={14} /> : <Copy size={14} />}
                    {copiedVendors ? "Copied!" : "Copy Emails"}
                  </button>
                  <button
                    onClick={() => exportCSV("vendors")}
                    className="px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition flex items-center gap-2"
                  >
                    <Download size={16} /> Export
                  </button>
                  <button
                    onClick={() => setConfirmClear("vendors")}
                    className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 font-semibold text-xs hover:bg-red-500/20 transition flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Clear All
                  </button>
                </div>
              </div>

              {loadingVendors ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="animate-spin text-primary" size={28} />
                </div>
              ) : filteredVendors.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <Store size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No vendors found</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-foreground">Reference</th>
                        <th className="text-left px-4 py-3 font-semibold text-foreground">Brand</th>
                        <th className="text-left px-4 py-3 font-semibold text-foreground">Email</th>
                        <th className="text-left px-4 py-3 font-semibold text-foreground">Category</th>
                        <th className="text-left px-4 py-3 font-semibold text-foreground">Sub-Category</th>
                        <th className="text-left px-4 py-3 font-semibold text-foreground">Amount</th>
                        <th className="text-left px-4 py-3 font-semibold text-foreground">Payment</th>
                        <th className="text-left px-4 py-3 font-semibold text-foreground">Scan Status</th>
                        <th className="text-left px-4 py-3 font-semibold text-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredVendors.map((v) => (
                        <tr key={v.id} className="hover:bg-muted/50 transition">
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{v.reference}</td>
                          <td className="px-4 py-3">
                            <p className="text-foreground font-medium">{v.brand_name}</p>
                            <p className="text-xs text-muted-foreground">@{v.instagram}</p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{v.email}</td>
                          <td className="px-4 py-3 text-muted-foreground">{v.business_category}</td>
                          <td className="px-4 py-3 text-muted-foreground">{v.sub_category}</td>
                          <td className="px-4 py-3 text-foreground font-semibold">₦{(v.amount / 100).toLocaleString()}</td>
                          <td className="px-4 py-3">{getStatusBadge(v.status)}</td>
                          <td className="px-4 py-3">
                            {v.scanned ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
                                  <CheckCircle2 size={12} /> Scanned
                                </span>
                                {v.scanned_at && (
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    {new Date(v.scanned_at).toLocaleString()}
                                  </p>
                                )}
                                {v.scanned_by && (
                                  <p className="text-[10px] text-muted-foreground">by {v.scanned_by}</p>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                                <Clock size={12} /> Not yet
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {new Date(v.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex justify-between text-sm text-muted-foreground">
                <span>Total: {filteredVendors.length} records</span>
                <span>
                  Revenue: ₦
                  {(filteredVendors.filter((v) => v.status === "paid").reduce((sum, v) => sum + v.amount, 0) / 100).toLocaleString()}
                </span>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Confirm Clear Dialog */}
        <AlertDialog open={!!confirmClear} onOpenChange={(open) => !open && setConfirmClear(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Clear all {confirmClear === "tickets" ? "ticket" : "vendor"} records?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete{" "}
                {confirmClear === "tickets"
                  ? "every ticket purchase, issued ticket, and payment intent"
                  : "every vendor application"}{" "}
                from the database. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={clearing}
                onClick={(e) => {
                  e.preventDefault();
                  if (confirmClear) clearAll(confirmClear);
                }}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {clearing ? "Clearing..." : "Yes, clear all"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* History Dialog */}
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Event History</DialogTitle>
              <DialogDescription>
                Tap a past edition to view its ticket and vendor records.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 mt-2">
              <button
                onClick={() => {
                  setSelectedEdition(CURRENT_EDITION);
                  setHistoryOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                  selectedEdition === CURRENT_EDITION
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                  Current
                </p>
                <p className="font-display font-bold text-foreground">Otown Party 12.0</p>
                <p className="text-xs text-muted-foreground">Iseyin Edition · June 2026</p>
              </button>
              {PAST_EDITIONS.map((ed) => {
                const ticketCount = rawTickets.filter(
                  (t) => (t.edition || CURRENT_EDITION) === ed.value
                ).length;
                const vendorCount = vendors.filter(
                  (v) => (v.edition || CURRENT_EDITION) === ed.value
                ).length;
                return (
                  <button
                    key={ed.value}
                    onClick={() => {
                      setSelectedEdition(ed.value);
                      setHistoryOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                      selectedEdition === ed.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Past Edition
                    </p>
                    <p className="font-display font-bold text-foreground">{ed.label}</p>
                    <p className="text-xs text-muted-foreground">{ed.date}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {ticketCount} ticket{ticketCount !== 1 ? "s" : ""} · {vendorCount} vendor{vendorCount !== 1 ? "s" : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Reminder Email Dialog */}
        <Dialog open={reminderOpen} onOpenChange={(o) => !reminderSending && setReminderOpen(o)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Mail size={18} className="text-primary" />
                Email All Ticket Buyers
              </DialogTitle>
              <DialogDescription>
                {reminderAudience === "edition" && <>Sending to ticket buyers for <span className="text-primary font-semibold">{selectedEdition}</span></>}
                {reminderAudience === "all" && <>Sending to <span className="text-primary font-semibold">every ticket buyer since the first edition</span></>}
                {reminderAudience === "manual" && <>Sending only to the <span className="text-primary font-semibold">addresses you type below</span></>}
                {reminderCount !== null && (
                  <> · <span className="text-foreground font-semibold">{reminderCount}</span> recipient{reminderCount !== 1 ? "s" : ""}</>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Recipients
                </label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { key: "edition", label: "This edition" },
                    { key: "all", label: "All recipients (since edition 1)" },
                    { key: "manual", label: "Manual addresses" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setReminderAudience(opt.key)}
                      disabled={reminderSending}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition disabled:opacity-50 ${
                        reminderAudience === opt.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-primary hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Extra / manual email addresses
                </label>
                <textarea
                  value={manualEmails}
                  onChange={(e) => setManualEmails(e.target.value)}
                  rows={2}
                  disabled={reminderSending}
                  placeholder="name@example.com, another@example.com"
                  className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y disabled:opacity-60"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Separate with commas, spaces or new lines. These are always included (and are the only recipients in “Manual addresses” mode).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  value={reminderSubject}
                  onChange={(e) => setReminderSubject(e.target.value)}
                  maxLength={200}
                  disabled={reminderSending}
                  className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Message
                </label>
                <textarea
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  maxLength={8000}
                  rows={12}
                  disabled={reminderSending}
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y disabled:opacity-60"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Blank lines create paragraphs. The Otown Party header and footer are added automatically.
                </p>
              </div>

              {reminderResult && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                  ✅ Sent <span className="font-semibold text-primary">{reminderResult.sent}</span> of{" "}
                  <span className="font-semibold">{reminderResult.total}</span>
                  {reminderResult.failed > 0 && (
                    <> · <span className="text-red-500 font-semibold">{reminderResult.failed} failed</span></>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
              <button
                onClick={() => {
                  setReminderSubject(DEFAULT_REMINDER_SUBJECT);
                  setReminderMessage(DEFAULT_REMINDER_MESSAGE);
                }}
                disabled={reminderSending}
                className="text-xs text-muted-foreground hover:text-primary transition disabled:opacity-50"
              >
                Reset to default
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReminderOpen(false)}
                  disabled={reminderSending}
                  className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition disabled:opacity-50"
                >
                  Close
                </button>
                <button
                  onClick={sendReminder}
                  disabled={reminderSending || reminderCount === 0}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition disabled:opacity-50"
                >
                  {reminderSending ? (
                    <><Loader2 size={14} className="animate-spin" /> Sending...</>
                  ) : (
                    <><Send size={14} /> Send to {reminderCount ?? "…"} buyer{reminderCount === 1 ? "" : "s"}</>
                  )}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </main>

  );
};

export default Record;
