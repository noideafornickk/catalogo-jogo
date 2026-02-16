import { SuspendedClient } from "./SuspendedClient";

type SuspendedPageProps = {
  searchParams?: Promise<{
    until?: string;
  }>;
};

export default async function SuspendedPage({ searchParams }: SuspendedPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialUntil =
    typeof resolvedSearchParams?.until === "string"
      ? resolvedSearchParams.until
      : null;

  return <SuspendedClient initialUntil={initialUntil} />;
}
