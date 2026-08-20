import { AssetTypeListPage, type AssetListSearchParams } from "../_shared/asset-type-list-page";

// Awaited, not returned as a bare promise: AssetTypeListPage may call redirect(), and that
// throw has to happen inside this page component's own frame for Next to recognise it as a
// redirect. Returning the un-awaited promise swallowed it into a 200 + not-found body.
export default async function Page({ searchParams }: { searchParams: Promise<AssetListSearchParams> }) {
  return await AssetTypeListPage({ assetType: "SIM_CARD", searchParams });
}