import { redirect } from "next/navigation";

export default function SiteAccessRedirect() {
  redirect("/login");
}