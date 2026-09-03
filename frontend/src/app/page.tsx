import { redirect } from "next/navigation";

// The proxy handles the real entry routing; this is a safety net for
// environments where the proxy is bypassed.
export default function RootPage() {
  redirect("/login");
}
