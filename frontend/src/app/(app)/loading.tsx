import { Spinner } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner />
    </div>
  );
}
