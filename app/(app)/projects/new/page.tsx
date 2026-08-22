"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject, testFacebookConnection } from "../actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Eye, EyeOff, Sparkles, Check, AlertCircle, MessageCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export default function NewProjectPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Facebook Integration States
  const [isFbActive, setIsFbActive] = useState(false);
  const [fbPixelId, setFbPixelId] = useState("");
  const [fbConversionsToken, setFbConversionsToken] = useState("");
  const [fbTestCode, setFbTestCode] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  // Instant lead messaging — on by default.
  const [autoMessage, setAutoMessage] = useState(true);

  async function handleTestConnection() {
    if (!fbPixelId || !fbConversionsToken) {
      toast.error("Please enter Pixel ID and Conversions Token to test connection.");
      return;
    }

    setIsTesting(true);
    try {
      const res = await testFacebookConnection({
        pixelId: fbPixelId,
        token: fbConversionsToken,
        testEventCode: fbTestCode,
      });

      if (res.success) {
        toast.success("🎉 Test connection successful! Check Meta Events Manager.");
      } else {
        toast.error(res.error || "Connection test failed. Please check credentials.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to test connection.");
    } finally {
      setIsTesting(false);
    }
  }

  async function onSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      // Append switch state explicitly
      formData.append("facebook_integration_active", String(isFbActive));
      formData.append("auto_message_leads", String(autoMessage));

      const result = await createProject(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Project created successfully");
      router.push("/projects");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link
          href="/projects"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Project</h1>
          <p className="text-muted-foreground">
            Add a new real estate development or property.
          </p>
        </div>
      </div>

      <form action={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Enter the basic information about the project.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input id="name" name="name" required placeholder="e.g. Ruhil Palladium" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Property Type *</Label>
                <Select name="type" required defaultValue="APARTMENT">
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APARTMENT">Apartment</SelectItem>
                    <SelectItem value="VILLA">Villa</SelectItem>
                    <SelectItem value="PLOT">Plot</SelectItem>
                    <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" placeholder="e.g. Downtown" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_min">Minimum Price</Label>
                <Input id="price_min" name="price_min" type="number" min="0" placeholder="e.g. 500000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_max">Maximum Price</Label>
                <Input id="price_max" name="price_max" type="number" min="0" placeholder="e.g. 1500000" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Brief description of the project..."
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Instant lead messaging (mig 024) */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-zinc-50 border-b border-zinc-100 flex flex-row items-center justify-between space-y-0 py-4">
            <div className="flex items-center space-x-2">
              <div className="bg-emerald-600/10 p-2 rounded-lg text-emerald-600">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Instant lead messaging</CardTitle>
                <CardDescription className="text-[11px] leading-snug">
                  Send every new lead in this project an instant welcome on WhatsApp and email.
                </CardDescription>
              </div>
            </div>
            <Switch checked={autoMessage} onCheckedChange={setAutoMessage} />
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">
              {autoMessage
                ? "On — the moment a lead lands here, the acknowledgment email and the WhatsApp welcome template go out automatically."
                : "Off — no automatic email or WhatsApp is sent to leads in this project. You can still message them manually from the lead page."}
            </p>
          </CardContent>
        </Card>

        {/* Facebook Ads Integration Settings Card */}
        <Card className="overflow-hidden border-blue-500/20 shadow-md">
          <CardHeader className="bg-zinc-50 border-b border-zinc-100 flex flex-row items-center justify-between space-y-0 py-4">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-600/10 p-2 rounded-lg text-blue-600">
                <FacebookIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Meta Ads Conversions API</CardTitle>
                <CardDescription className="text-[11px] leading-snug">
                  Optimize your ad spend by sending qualified lead conversion signals back to Meta.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={isFbActive}
                onCheckedChange={setIsFbActive}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {isFbActive ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="facebook_pixel_id">Meta Pixel ID *</Label>
                  <Input
                    id="facebook_pixel_id"
                    name="facebook_pixel_id"
                    required={isFbActive}
                    placeholder="e.g. 123456789012345"
                    value={fbPixelId}
                    onChange={(e) => setFbPixelId(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Your 15-digit Meta Pixel ID.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebook_conversions_token">Meta Conversions API Token *</Label>
                  <div className="relative">
                    <Input
                      id="facebook_conversions_token"
                      name="facebook_conversions_token"
                      type={showToken ? "text" : "password"}
                      required={isFbActive}
                      placeholder="EAABwz..."
                      value={fbConversionsToken}
                      onChange={(e) => setFbConversionsToken(e.target.value)}
                      className="pr-10 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-700"
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Conversions API system access token generated inside Meta Events Manager.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebook_test_event_code">Test Event Code (Optional)</Label>
                  <Input
                    id="facebook_test_event_code"
                    name="facebook_test_event_code"
                    placeholder="e.g. TEST12345"
                    value={fbTestCode}
                    onChange={(e) => setFbTestCode(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Required for testing integration signals inside Meta's "Test Events" tab.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-zinc-100 mt-2">
                  <a
                    href="https://developers.facebook.com/docs/sharing/webmasters/faq/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    Meta Documentation ↗
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    disabled={isTesting || !fbPixelId || !fbConversionsToken}
                    onClick={handleTestConnection}
                  >
                    {isTesting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                    )}
                    Test Connection
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-2 text-center text-xs text-muted-foreground">
                Enable this option to link Meta Pixel/CAPI tracking to leads in this project.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2 pt-2">
          <Link href="/projects" className={buttonVariants({ variant: "outline" })}>
            Cancel
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Project
          </Button>
        </div>
      </form>
    </div>
  );
}
