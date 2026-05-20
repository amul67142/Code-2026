export const metadata = {
  title: "Accept Invite — Big Lead CRM",
};

import { InviteClient } from "./invite-client";

export default function InvitePage() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-[#F7F8FA]">
      <div className="w-full max-w-[400px] rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <InviteClient />
      </div>
    </div>
  );
}
