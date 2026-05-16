"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileType, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { bulkImportLeads } from "./actions";

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CRM_FIELDS = [
  { key: "name", label: "Lead Name", required: true },
  { key: "phone", label: "Phone Number" },
  { key: "email", label: "Email Address" },
  { key: "budget_min", label: "Min Budget" },
  { key: "budget_max", label: "Max Budget" },
  { key: "bhk_preference", label: "BHK Preference" },
  { key: "location_preference", label: "Location" },
  { key: "notes", label: "Notes/Remarks" },
];

const LEAD_SOURCES = [
  "MANUAL",
  "GOOGLE_ADS",
  "FACEBOOK_ADS",
  "WEBSITE_FORM",
  "PORTAL_99ACRES",
  "PORTAL_MAGICBRICKS",
  "PORTAL_HOUSING",
  "WALK_IN",
  "REFERRAL",
  "CSV_IMPORT",
  "OTHER",
];

export function ImportLeadsDialog({ open, onOpenChange }: ImportLeadsDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isImporting, setIsImporting] = useState(false);

  // File data
  const [fileName, setFileName] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [csvData, setCsvData] = useState<any[]>([]);

  // Mapping state: mapping[crmFieldKey] = csvHeaderName
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [defaultSource, setDefaultSource] = useState<string>("CSV_IMPORT");

  // Reset state when closed
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTimeout(() => {
        setStep(1);
        setFileName("");
        setCsvHeaders([]);
        setCsvData([]);
        setMapping({});
        setDefaultSource("CSV_IMPORT");
      }, 200);
    }
    onOpenChange(newOpen);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields) {
          setCsvHeaders(results.meta.fields);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setCsvData(results.data as any[]);
          
          // Auto-guess mapping
          const newMapping: Record<string, string> = {};
          CRM_FIELDS.forEach((field) => {
            const match = results.meta.fields?.find(
              (h) => h.toLowerCase().replace(/[^a-z]/g, "") === field.key.toLowerCase().replace(/[^a-z]/g, "") ||
                     h.toLowerCase().includes(field.key.split('_')[0])
            );
            if (match) newMapping[field.key] = match;
          });
          setMapping(newMapping);
          setStep(2);
        } else {
          toast.error("Could not read columns from CSV");
        }
      },
      error: (error) => {
        toast.error("Error parsing CSV: " + error.message);
      },
    });
  };

  const handleNextToReview = () => {
    // Validate required fields
    if (!mapping["name"]) {
      toast.error("You must map the 'Lead Name' field.");
      return;
    }
    setStep(3);
  };

  const handleImport = async () => {
    setIsImporting(true);

    // Prepare data
    const validLeads = csvData.map((row) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lead: any = {
        source: defaultSource,
      };

      Object.entries(mapping).forEach(([crmKey, csvCol]) => {
        if (csvCol && row[csvCol] !== undefined && row[csvCol] !== "") {
          if (crmKey === "budget_min" || crmKey === "budget_max") {
            const num = parseFloat(row[csvCol].replace(/,/g, ""));
            if (!isNaN(num)) lead[crmKey] = num;
          } else {
            lead[crmKey] = row[csvCol];
          }
        }
      });

      return lead;
    }).filter(lead => lead.name && lead.name.trim() !== ""); // Must have a name

    try {
      const result = await bulkImportLeads(validLeads);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Successfully imported ${validLeads.length} leads!`);
        router.refresh();
        handleOpenChange(false);
      }
    } catch {
      toast.error("An unexpected error occurred during import.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Leads via CSV</DialogTitle>
          <DialogDescription>
            {step === 1 && "Upload your CSV file to get started."}
            {step === 2 && "Map your CSV columns to the CRM fields."}
            {step === 3 && "Review and confirm your import."}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: UPLOAD */}
        {step === 1 && (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/30">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Click to upload CSV</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
              Make sure your CSV has a header row.
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              Select File
            </Button>
          </div>
        )}

        {/* STEP 2: MAPPING */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-muted p-3 rounded-md flex items-center gap-2 text-sm">
              <FileType className="h-4 w-4 text-primary" />
              <span>File: <strong>{fileName}</strong> ({csvData.length} rows)</span>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-4 pr-2">
              {CRM_FIELDS.map((field) => (
                <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
                  <Label className="flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </Label>
                  <Select
                    value={mapping[field.key] || "unmapped"}
                    onValueChange={(val: string | null) => setMapping(prev => ({ ...prev, [field.key]: !val || val === "unmapped" ? "" : val }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Do not import" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unmapped" className="text-muted-foreground italic">
                        -- Do not import --
                      </SelectItem>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleNextToReview}>Continue to Review</Button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-muted/50 border rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Ready to Import</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    We found {csvData.filter(r => r[mapping["name"]]?.trim()).length} valid rows to import from {fileName}.
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="mb-2 block text-sm">Assign Default Lead Source</Label>
                <Select value={defaultSource} onValueChange={(val: string | null) => setDefaultSource(val ?? "CSV_IMPORT")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> All imported leads will have this source.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(2)} disabled={isImporting}>Back</Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import Leads
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
