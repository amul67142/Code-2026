"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { completeWhatsAppEmbeddedSignup } from "./whatsapp-actions";

const APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
const CONFIG_ID = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID;
const GRAPH_VERSION = "v21.0";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

/**
 * WhatsApp Embedded Signup — one-click client self-connect.
 * Launches Meta's popup via the FB JS SDK; captures waba_id + phone_number_id
 * from the session-info message, and the auth code from FB.login; then hands
 * both to the server action to finish the connection.
 */
export function WhatsAppEmbeddedSignup({ onConnected }: { onConnected?: () => void }) {
  const [loading, setLoading] = useState(false);
  const sessionRef = useRef<{ wabaId?: string; phoneNumberId?: string }>({});

  useEffect(() => {
    // Init the SDK when it loads.
    window.fbAsyncInit = function () {
      try {
        window.FB?.init({
          appId: APP_ID,
          autoLogAppEvents: true,
          xfbml: false,
          version: GRAPH_VERSION,
        });
      } catch {
        /* ignore */
      }
    };
    if (window.FB) window.fbAsyncInit();

    // Capture the WABA + phone number id from the embedded-signup popup.
    function onMessage(event: MessageEvent) {
      try {
        const host = new URL(event.origin).hostname;
        if (!/facebook\.com$/.test(host)) return;
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "WA_EMBEDDED_SIGNUP" && data?.event === "FINISH") {
          sessionRef.current = {
            wabaId: data.data?.waba_id,
            phoneNumberId: data.data?.phone_number_id,
          };
        }
      } catch {
        /* not our message / unparseable origin */
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function launch() {
    if (!CONFIG_ID || !APP_ID) {
      toast.error("WhatsApp signup isn't configured yet. Add the config ID and reload.");
      return;
    }
    if (!window.FB) {
      toast.error("Facebook is still loading — try again in a moment.");
      return;
    }

    setLoading(true);
    sessionRef.current = {};

    window.FB.login(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (response: any) => {
        const code = response?.authResponse?.code;
        if (!code) {
          setLoading(false);
          toast.info("WhatsApp connection cancelled.");
          return;
        }
        const { wabaId, phoneNumberId } = sessionRef.current;
        if (!wabaId || !phoneNumberId) {
          setLoading(false);
          toast.error("Didn't receive your WhatsApp account details. Please try again.");
          return;
        }
        completeWhatsAppEmbeddedSignup({ code, wabaId, phoneNumberId }).then((res) => {
          setLoading(false);
          if (res?.error) {
            toast.error(res.error);
          } else {
            toast.success("WhatsApp connected 🎉");
            onConnected?.();
          }
        });
      },
      {
        config_id: CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "",
          sessionInfoVersion: "3",
        },
      }
    );
  }

  return (
    <>
      <Script src="https://connect.facebook.net/en_US/sdk.js" strategy="afterInteractive" />
      <Button
        onClick={launch}
        disabled={loading}
        className="bg-[#25D366] hover:bg-[#1ebe5d] text-white"
      >
        {loading ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <MessageCircle className="mr-2 size-4" />
        )}
        Connect WhatsApp
      </Button>
    </>
  );
}
