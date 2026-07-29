import { getPromoCodes } from "./actions";
import PromosClient from "./PromosClient";

export const metadata = {
  title: "Promo Codes — Big Lead CRM Owner",
};

export const dynamic = "force-dynamic";

export default async function PromosPage() {
  const { promos, plans } = await getPromoCodes();
  return <PromosClient initialPromos={promos} plans={plans} />;
}
