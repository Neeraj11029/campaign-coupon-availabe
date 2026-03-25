"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

interface CouponData {
  coupon_code: string;
  clickCount: number;
  email: string;
  user_id: number | null;
  coupon_valid_on_plan_id: string;
  user_register_on_plan_id: string | null;
  referral_url: string;
  trial_start_on: string | null;
  trial_end_on: string | null;
  plan_changed_on: string | null;
  updated_plan_id: string | null;
  reason: string | null;
  created_at: string;
  user_registered_at: string | null;
}

interface Campaign {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  start_on: string;
  end_on: string;
}

interface CampaignResponse {
  message: string;
  data: {
    campaignname: string;
    description: string;
    is_active: boolean;
    start_on: string;
    end_on: string;
    totalCount: number;
    coupons: CouponData[];
  };
}

function getStatus(coupon: CouponData): "active" | "cancelled" | "upgraded" | "downgraded" | "unregistered" {
  if (!coupon.user_id) return "unregistered";
  if (coupon.reason === "trial_cancellation" || coupon.reason === "trial cancellation") return "cancelled";
  if (coupon.reason === "plan_upgraded") return "upgraded";
  if (coupon.reason === "plan_downgraded") return "downgraded";
  return "active";
}

const statusStyles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
  cancelled: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
  upgraded: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
  downgraded: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
  unregistered: "bg-gray-50 text-gray-500 ring-1 ring-gray-400/20",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const PAGE_SIZE = 10;

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignData, setCampaignData] = useState<CampaignResponse["data"] | null>(null);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [view, setView] = useState<"table" | "cards">("table");

  useEffect(() => {
    if (window.innerWidth < 768) setView("cards");
  }, []);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "partner") {
      router.replace("/");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  // Fetch campaigns list
  useEffect(() => {
    if (!authorized) return;

    const fetchCampaigns = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        const apiKey = process.env.NEXT_PUBLIC_API_KEY;
        const res = await fetch(`${baseUrl}/v1/campaigns`, {
          headers: { Authorization: apiKey || "" },
        });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json = await res.json();
        setCampaigns(json.campaigns ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch campaigns");
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [authorized]);

  // Fetch coupons when a campaign is selected
  useEffect(() => {
    if (!selectedCampaign) return;

    const fetchCoupons = async () => {
      setCouponsLoading(true);
      setCampaignData(null);
      setError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        const apiKey = process.env.NEXT_PUBLIC_API_KEY;
        const res = await fetch(
          `${baseUrl}/v1/campaign_coupon_stats?campaign_id=${selectedCampaign.id}`,
          { headers: { Authorization: apiKey || "" } }
        );
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json: CampaignResponse = await res.json();
        setCampaignData(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch coupons");
      } finally {
        setCouponsLoading(false);
      }
    };

    fetchCoupons();
  }, [selectedCampaign]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedCampaign]);

  const coupons = campaignData?.coupons ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return coupons;
    const q = search.toLowerCase();
    return coupons.filter(
      (c) =>
        c.coupon_code.toLowerCase().includes(q) ||
        getStatus(c).includes(q)
    );
  }, [coupons, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeCoupons = coupons.filter((c) => getStatus(c) === "active");
  const registeredCoupons = coupons.filter((c) => c.user_id !== null);
  const totalClicks = coupons.reduce((sum, c) => sum + c.clickCount, 0);

  if (!authorized) return null;

  const handleBack = () => {
    setSelectedCampaign(null);
    setCampaignData(null);
    setSearch("");
    setPage(1);
    setError(null);
  };

  // ── Campaign Cards View (no campaign selected) ──
  if (!selectedCampaign) {
    return (
      <>
        <Navbar />
        <div className="pt-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Partner Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">Select a campaign to view its coupons</p>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
                {error}
              </div>
            )}

            {!loading && !error && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {campaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    onClick={() => setSelectedCampaign(campaign)}
                    className="group text-left rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-600 group-hover:from-indigo-100 group-hover:to-purple-100 transition-colors">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                        </svg>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          campaign.is_active
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                            : "bg-red-50 text-red-700 ring-1 ring-red-600/20"
                        }`}
                      >
                        {campaign.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {campaign.description ? formatName(campaign.description) : formatName(campaign.name)}
                    </h3>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                      <span>{formatDate(campaign.start_on)} → {formatDate(campaign.end_on)}</span>
                      <svg className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </button>
                ))}

                {campaigns.length === 0 && (
                  <div className="col-span-full py-20 text-center text-gray-400">
                    No campaigns found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Coupons View (campaign selected) ──
  return (
    <>
      <Navbar />
      <div className="pt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          {/* Breadcrumb + Header */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2 flex-wrap">
                <button onClick={handleBack} className="hover:text-indigo-600 transition-colors whitespace-nowrap">
                  Partner Dashboard
                </button>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                <span className="text-gray-900 font-medium">
                  {campaignData ? formatName(campaignData.campaignname) : formatName(selectedCampaign.name)}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                {campaignData ? formatName(campaignData.campaignname) : formatName(selectedCampaign.name)}
              </h1>
              {campaignData && (
                <p className="mt-1 text-sm text-gray-500">
                  {campaignData.description} &middot;{" "}
                  <span className={campaignData.is_active ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                    {campaignData.is_active ? "Active" : "Inactive"}
                  </span>
                  {" "}&middot; {formatDate(campaignData.start_on)} → {formatDate(campaignData.end_on)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setView("table")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setView("cards")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === "cards" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Cards
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="rounded-xl bg-white p-4 sm:p-5 border border-gray-100 shadow-sm">
              <p className="text-xs sm:text-sm font-medium text-gray-500">Total Coupons</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-gray-900">{campaignData?.totalCount ?? "—"}</p>
            </div>
            <div className="rounded-xl bg-white p-4 sm:p-5 border border-gray-100 shadow-sm">
              <p className="text-xs sm:text-sm font-medium text-gray-500">Active</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-emerald-600">{activeCoupons.length}</p>
            </div>
            <div className="rounded-xl bg-white p-4 sm:p-5 border border-gray-100 shadow-sm">
              <p className="text-xs sm:text-sm font-medium text-gray-500">Registered</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-blue-600">{registeredCoupons.length}</p>
            </div>
            <div className="rounded-xl bg-white p-4 sm:p-5 border border-gray-100 shadow-sm">
              <p className="text-xs sm:text-sm font-medium text-gray-500">Total Clicks</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-purple-600">{totalClicks}</p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by code or status..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
            {search && (
              <p className="mt-2 text-xs text-gray-500">
                Showing {filtered.length} of {coupons.length} coupons
              </p>
            )}
          </div>

          {/* Loading / Error */}
          {couponsLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
              {error}
            </div>
          )}

          {/* Table View */}
          {!couponsLoading && !error && view === "table" && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50/50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-3.5 font-semibold text-gray-600 whitespace-nowrap">Code</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-3.5 font-semibold text-gray-600 whitespace-nowrap">Clicks</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-3.5 font-semibold text-gray-600 whitespace-nowrap">Status</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-3.5 font-semibold text-gray-600 whitespace-nowrap">Created</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-3.5 font-semibold text-gray-600 whitespace-nowrap">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginated.map((coupon) => {
                      const status = getStatus(coupon);
                      return (
                        <tr key={coupon.coupon_code} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-3 sm:px-6 py-3 sm:py-4 font-mono font-semibold text-gray-900 whitespace-nowrap">{coupon.coupon_code}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-900 font-medium">{coupon.clickCount}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[status]}`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-500 whitespace-nowrap">{formatDate(coupon.created_at)}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-500 whitespace-nowrap">{formatDate(coupon.user_registered_at)}</td>
                        </tr>
                      );
                    })}
                    {paginated.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                          No coupons found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cards View */}
          {!couponsLoading && !error && view === "cards" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginated.map((coupon) => {
                  const status = getStatus(coupon);
                  return (
                    <div
                      key={coupon.coupon_code}
                      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <span className="font-mono text-sm sm:text-lg font-bold text-gray-900 truncate">{coupon.coupon_code}</span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[status]}`}>
                          {status}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Clicks</span>
                          <span className="text-gray-900 font-semibold">{coupon.clickCount}</span>
                        </div>
                        {coupon.reason && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Reason</span>
                            <span className="text-gray-700">{coupon.reason.replace(/_/g, " ")}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">Created</span>
                          <span className="text-gray-700">{formatDate(coupon.created_at)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Registered</span>
                          <span className="text-gray-700">{formatDate(coupon.user_registered_at)}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <a
                          href={coupon.referral_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:text-indigo-700 truncate block"
                        >
                          {coupon.referral_url}
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
              {paginated.length === 0 && (
                <div className="py-12 text-center text-gray-400">No coupons found</div>
              )}
            </>
          )}

          {/* Pagination */}
          {!couponsLoading && !error && totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} ({filtered.length} results)
              </p>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-200 px-2.5 sm:px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => (
                    <span key={p} className="flex items-center gap-1 sm:gap-2">
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="text-gray-400 text-sm px-1">...</span>
                      )}
                      <button
                        onClick={() => setPage(p)}
                        className={`rounded-lg px-2.5 sm:px-3 py-2 text-sm font-medium transition-colors ${
                          p === page
                            ? "bg-indigo-600 text-white"
                            : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-200 px-2.5 sm:px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
