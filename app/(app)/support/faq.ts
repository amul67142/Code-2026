/**
 * Help shown on the Support page. Keep every answer true to how BigLead works
 * today — clients follow these word for word.
 */
export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqGroup {
  title: string;
  items: FaqItem[];
}

export const FAQ: FaqGroup[] = [
  {
    title: "Leads",
    items: [
      {
        q: "How do I get my Facebook / Instagram ad leads into BigLead?",
        a: "Go to Settings → Integrations → Facebook Lead Ads, connect your Facebook account and pick the pages you run ads from. New leads arrive within seconds. If you connected but no leads come in, open your Facebook Page settings → Leads Access → CRMs and add BigLead — a page with Leads Access turned on blocks every CRM until you allow it.",
      },
      {
        q: "How do I bring in leads from Google Ads, 99acres, my website or Pabbly?",
        a: "Create a webhook in Settings → Integrations, choose the project the leads belong to, and paste the webhook URL into the other tool (Pabbly, Zapier, your website form, a portal). Every lead sent to that URL lands in that project.",
      },
      {
        q: "Who gets a new lead?",
        a: "Leads are shared out to your agents automatically using the rules in Settings → Routing. Agents only see the leads assigned to them; admins and team leads see everyone's.",
      },
      {
        q: "I imported a CSV. Why didn't the leads get a WhatsApp message?",
        a: "On purpose. Imported leads never get an automatic message, so an old list can't hurt your WhatsApp number's quality rating. You can still message them yourself from the lead page or with a bulk send.",
      },
      {
        q: "Can I stop the instant welcome message for one project?",
        a: "Yes. Open the project and switch off instant lead messaging. Leads in that project then get no automatic email or WhatsApp; you can still message them by hand.",
      },
    ],
  },
  {
    title: "WhatsApp",
    items: [
      {
        q: "How do I connect my WhatsApp number?",
        a: "Go to Settings → Integrations → WhatsApp and click Connect. Log in with Facebook, choose or create your business, and add the number. The number must not be in use on the WhatsApp app at the same time.",
      },
      {
        q: "My WhatsApp messages fail with a payment error. What do I do?",
        a: "Meta charges for template messages (like the welcome message) and needs a payment method and tax details on your WhatsApp account. Open WhatsApp Manager (business.facebook.com) → your account → Payment settings, add a card and your business tax details. Messages start going out as soon as that's saved.",
      },
      {
        q: "Why is my template still pending, or rejected?",
        a: "Meta reviews every template, usually within minutes, sometimes up to a day. Rejections are mostly for promotional wording in a Utility template, missing sample values, or variables at the very start or end of the message. Edit it on the WhatsApp Templates page (Settings → Integrations → WhatsApp → Templates) and submit again.",
      },
      {
        q: "Why can't I type a normal message to a lead in Live Chat?",
        a: "WhatsApp only allows free-form messages within 24 hours of the lead's last message to you. After that you have to send an approved template; once they reply, the 24-hour window opens again.",
      },
    ],
  },
  {
    title: "Team & access",
    items: [
      {
        q: "How do I add a team member?",
        a: "Settings → Team → Invite. They get an email to set their password. Pick their role: Admins manage settings, Team Leads see the whole pipeline, Agents work only their own leads.",
      },
      {
        q: "A team member didn't get the invite email.",
        a: "Ask them to check spam and promotions. If it still hasn't arrived, raise a ticket with their email address and we'll sort it out.",
      },
      {
        q: "I forgot my password.",
        a: "Use \"Forgot password\" on the login page and follow the link in the email. If the link has expired, request a new one.",
      },
    ],
  },
  {
    title: "Billing",
    items: [
      {
        q: "What am I paying for each month?",
        a: "A platform fee, plus a charge for each seat beyond the ones your plan includes. Settings → Billing shows your plan, what's covered, and when each payment is next due. The platform fee and seats can be paid separately.",
      },
      {
        q: "Where are my invoices?",
        a: "Settings → Billing → Invoices. Open one and use Download / Print to save it as a PDF.",
      },
      {
        q: "What are WhatsApp credits?",
        a: "Credits are used for messages BigLead sends for you. You can see your balance and buy more in Settings → Billing.",
      },
      {
        q: "What happens if I don't pay on time?",
        a: "You get a few days' grace after the due date with reminders. After that the workspace is paused until the payment is made — your leads and data are kept.",
      },
    ],
  },
];
