import { ForgotPasswordClient } from "./forgot-password-client";

export const metadata = {
  title: "Forgot Password — Big Lead CRM",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-[#F7F8FA]">
      <ForgotPasswordClient />
    </div>
  );
}
