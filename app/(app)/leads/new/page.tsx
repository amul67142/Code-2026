"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createLead, getAgentsForAssignment } from "../actions";
import { getStages } from "../../settings/pipeline/actions";
import { getProjects } from "../../projects/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const SOURCES = [
  { value: "MANUAL", label: "Manual Entry" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "FACEBOOK_ADS", label: "Facebook Ads" },
  { value: "WEBSITE_FORM", label: "Website Form" },
  { value: "WALK_IN", label: "Walk-In" },
  { value: "REFERRAL", label: "Referral" },
  { value: "OTHER", label: "Other" },
];

interface Stage {
  id: string;
  name: string;
  color: string;
}

interface Project {
  id: string;
  name: string;
}

interface Agent {
  id: string;
  name: string;
}

export default function NewLeadPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [s, p, a] = await Promise.all([getStages(), getProjects(), getAgentsForAssignment()]);
        setStages(s as Stage[]);
        setProjects(p as Project[]);
        setAgents(a as Agent[]);
      } catch {
        toast.error("Failed to load form data");
      }
    }
    load();
  }, []);

  async function onSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      const result = await createLead(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Lead created successfully");
      router.push("/leads");
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
          href="/leads"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Lead</h1>
          <p className="text-muted-foreground">
            Manually capture a new sales lead.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead Details</CardTitle>
          <CardDescription>
            Fill in the contact and interest details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="e.g. Rahul Sharma"
              />
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="e.g. rahul@example.com"
                />
              </div>
            </div>

            {/* Source & Stage */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source">Lead Source</Label>
                <Select name="source" defaultValue="MANUAL">
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage_id">Pipeline Stage</Label>
                <Select name="stage_id" defaultValue={stages[0]?.id || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: s.color }}
                          />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Project & Assignee */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project_id">Interested Project</Label>
                <Select name="project_id">
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assigned_to_id">Assign To (Optional)</Label>
                <Select name="assigned_to_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Budget & BHK */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget_min">Budget Min</Label>
                <Input
                  id="budget_min"
                  name="budget_min"
                  type="number"
                  min="0"
                  placeholder="₹"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget_max">Budget Max</Label>
                <Input
                  id="budget_max"
                  name="budget_max"
                  type="number"
                  min="0"
                  placeholder="₹"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bhk_preference">BHK Preference</Label>
                <Input
                  id="bhk_preference"
                  name="bhk_preference"
                  placeholder="e.g. 3 BHK"
                />
              </div>
            </div>

            {/* Location pref */}
            <div className="space-y-2">
              <Label htmlFor="location_preference">Location Preference</Label>
              <Input
                id="location_preference"
                name="location_preference"
                placeholder="e.g. Bandra West, Andheri"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any additional notes about this lead..."
                className="min-h-[80px]"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-2 pt-4">
              <Link
                href="/leads"
                className={buttonVariants({ variant: "outline" })}
              >
                Cancel
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Lead
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
