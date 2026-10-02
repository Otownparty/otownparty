import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Events from "./pages/Events";
import About from "./pages/About";
import Gallery from "./pages/Gallery";
import Tickets from "./pages/Tickets";
import Claim from "./pages/Claim";
import Scan from "./pages/Scan";
import StaffAuth from "./pages/StaffAuth";
import NotFound from "./pages/NotFound";
import Success from "./pages/Success";
import Record from "./pages/Record";
import Vendor from "./pages/Vendor";
import VendorSuccess from "./pages/VendorSuccess";
import Partner from "./pages/Partner";
import PartnerAdmin from "./pages/staff/PartnerAdmin";
import Emails from "./pages/staff/Emails";
import IntroSplash, { shouldShowIntro } from "./components/IntroSplash";

const queryClient = new QueryClient();

const App = () => {
  const isHome = typeof window !== "undefined" && window.location.pathname === "/";
  const [showIntro, setShowIntro] = useState(isHome && shouldShowIntro());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {showIntro && <IntroSplash onDone={() => setShowIntro(false)} />}
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/events" element={<Events />} />
            <Route path="/about" element={<About />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/claim" element={<Claim />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/staff" element={<StaffAuth />} />
            <Route path="/success" element={<Success />} />
            <Route path="/record" element={<Record />} />
            <Route path="/vendor" element={<Vendor />} />
            <Route path="/vendor-success" element={<VendorSuccess />} />
            <Route path="/partner" element={<Partner />} />
            <Route path="/staff/partner" element={<PartnerAdmin />} />
            <Route path="/staff/emails" element={<Emails />} />
            <Route path="/records" element={<Record />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
