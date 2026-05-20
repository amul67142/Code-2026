import { ResetPasswordClient } from "./reset-password-client";

export const metadata = {
  title: "Set New Password — Big Lead CRM",
};

export default function ResetPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-[#F7F8FA]">
      <ResetPasswordClient />
    </div>
  );
}
