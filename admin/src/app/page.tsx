import { redirect } from "next/navigation";

export default function RootPage() {
  // `src/proxy.ts` normally handles this; this is the fallback.
  redirect("/overview");
}
