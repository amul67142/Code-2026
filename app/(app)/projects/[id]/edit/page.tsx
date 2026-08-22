"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getProject, updateProject, testFacebookConnection } from "../../actions";
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
import { ArrowLeft, Loader2, Eye, EyeOff, Sparkles, MessageCircle } from "lucide-react";
import { DeleteProjectButton } from "../../delete-project-button";
import Link from "next/link";
import { toast } from "sonner";

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Project fields
  const [name, setName] = useState("");
  const [type, setType] = useState("APARTMENT");
  const [location, setLocation] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  // Facebook Integration States
  const [isFbActive, setIsFbActive] = useState(false);
  const [fbPixelId, setFbPixelId] = useState("");
  const [fbConversionsToken, setFbConversionsToken] = useState("");
  const [fbTestCode, setFbTestCode] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [autoMessage, setAutoMessage] = useState(true);

  useEffect(() => {
    async function loadProject() {
      try {
        const project = await getProject(projectId);
        setName(project.name || "");
        setType(project.type || "APARTMENT");
        setLocation(project.location || "");
        setPriceMin(project.price_min ? String(project.price_min) : "");
        setPriceMax(project.price_max ? String(project.price_max) : "");
        setDescription(project.description || "");
        setStatus(project.status || "ACTIVE");
        setIsFbActive(project.facebook_integration_active || false);
        setFbPixelId(project.facebook_pixel_id || "");
        setFbConversionsToken(project.facebook_conversions_token || "");
        setFbTestCode(project.facebook_test_event_code || "");
        setAutoMessage(project.auto_message_leads !== false);
      } catch (err: any) {
        toast.error(err.message || "Failed to load project");
        router.push("/projects");
      } finally {
        setIsFetching(false);
      }
    }
    loadProject();
  }, [projectId, router]);

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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("type", type);
      formData.append("location", location);
      formData.append("price_min", priceMin);
      formData.append("price_max", priceMax);
      formData.append("description", description);
      formData.append("status", status);
      formData.append("facebook_pixel_id", fbPixelId);
      formData.append("facebook_conversions_token", fbConversionsToken);
      formData.append("facebook_test_event_code", fbTestCode);
      formData.append("facebook_integration_active", String(isFbActive));
      formData.append("auto_message_leads", String(autoMessage));

      const result = await updateProject(projectId, formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Project updated successfully");
      router.push("/projects");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
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
          <h1 className="text-2xl font-bold tracking-tight">Edit Project</h1>
          <p className="text-muted-foreground">
            Update project details and integration settings.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Update the basic information about the project.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Ruhil Palladium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Property Type *</Label>
                <Select value={type} onValueChange={(v) => v && setType(v)}>
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
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Downtown"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_min">Minimum Price</Label>
                <Input
                  id="price_min"
                  type="number"
                  min="0"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  placeholder="e.g. 500000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_max">Maximum Price</Label>
                <Input
                  id="price_max"
                  type="number"
                  min="0"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  placeholder="e.g. 1500000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                    placeholder="e.g. TEST12345"
                    value={fbTestCode}
                    onChange={(e) => setFbTestCode(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Required for testing integration signals inside Meta&apos;s &quot;Test Events&quot; tab.
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
            Save Changes
          </Button>
        </div>
      </form>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base">Danger zone</CardTitle>
          <CardDescription>
            Deleting a project is permanent. Its leads stay in the CRM, unlinked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteProjectButton projectId={projectId} projectName={name} variant="full" />
        </CardContent>
      </Card>
    </div>
  );
}
