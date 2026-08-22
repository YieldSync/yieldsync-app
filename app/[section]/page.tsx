import { notFound } from "next/navigation"
import { AppShell } from "@/components/dashboard/app-shell"
import { isSectionId } from "@/lib/navigation"

export default async function AppSectionPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params
  if (!isSectionId(section) || section === "dashboard") notFound()
  return <AppShell />
}
