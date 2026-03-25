"use client";

import { useEffect, useState, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

function formatPlan(planId: string | null): string {
  if (!planId) return "—";
  return planId
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const PAGE_SIZE = 10;

export default function CampaignCouponsPage({ params }: { params: Promise<{ campaignName: string }> }) {
  const { campaignName } = use(params);
  const decodedName = decodeURIComponent(campaignName);
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<CampaignResponse["data"] | null>(null);
  const [view, setView] = useState<"table" | "cards">("table");

  useEffect(() => {
    if (window.innerWidth < 768) setView("cards");
  }, []);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      router.replace("/");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  useEffect(() => {
    if (!authorized) return;

    const fetchCoupons = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        const apiKey = process.env.NEXT_PUBLIC_API_KEY;
        const res = await fetch(
          `${baseUrl}/v1/campaign_coupon_stats?campaign_id=${encodeURIComponent(decodedName)}`,
          { headers: { Authorization: apiKey || "" } }
        );
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json: CampaignResponse = await res.json();
        setCampaign(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch coupons");
      } finally {
        setLoading(false);
      }
    };

    fetchCoupons();
  }, [authorized, decodedName]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const coupons = campaign?.coupons ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return coupons;
    const q = search.toLowerCase();
    return coupons.filter(
      (c) =>
        c.coupon_code.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.coupon_valid_on_plan_id && (c.coupon_valid_on_plan_id.toLowerCase().includes(q) || formatPlan(c.coupon_valid_on_plan_id).toLowerCase().includes(q))) ||
        (c.user_register_on_plan_id && (c.user_register_on_plan_id.toLowerCase().includes(q) || formatPlan(c.user_register_on_plan_id).toLowerCase().includes(q))) ||
        (c.updated_plan_id && (c.updated_plan_id.toLowerCase().includes(q) || formatPlan(c.updated_plan_id).toLowerCase().includes(q))) ||
        getStatus(c).includes(q)
    );
  }, [coupons, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeCoupons = coupons.filter((c) => getStatus(c) === "active");
  const registeredCoupons = coupons.filter((c) => c.user_id !== null);
  const totalClicks = coupons.reduce((sum, c) => sum + c.clickCount, 0);

  if (!authorized) return null;

  return (
    <>
      <Navbar />
      <div className="pt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          {/* Breadcrumb + Header */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2 flex-wrap">
                <Link href="/coupons" className="hover:text-indigo-600 transition-colors">
                  Campaigns
                </Link>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                <span className="text-gray-900 font-medium">{campaign ? formatName(campaign.campaignname) : decodedName}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{campaign ? formatName(campaign.campaignname) : decodedName}</h1>
              {campaign && (
                <p className="mt-1 text-sm text-gray-500">
                  {campaign.description} &middot;{" "}
                  <span className={campaign.is_active ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                    {campaign.is_active ? "Active" : "Inactive"}
                  </span>
                  {" "}&middot; {formatDate(campaign.start_on)} → {formatDate(campaign.end_on)}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
            <div className="rounded-xl bg-white p-4 sm:p-5 border border-gray-100 shadow-sm">
              <p className="text-xs sm:text-sm font-medium text-gray-500">Total Coupons</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-gray-900">{campaign?.totalCount ?? "—"}</p>
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
                placeholder="Search by code, email, plan, or status..."
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

          {/* Table View */}
          {!loading && !error && view === "table" && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50/50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-3.5 font-semibold text-gray-600 whitespace-nowrap">Code</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-3.5 font-semibold text-gray-600 whitespace-nowrap">Email</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-3.5 font-semibold text-gray-600 whitespace-nowrap">Coupon Valid For Plan</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-3.5 font-semibold text-gray-600 whitespace-nowrap">Registered On Plan</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-3.5 font-semibold text-gray-600 whitespace-nowrap">Updated Plan</th>
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
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-700 whitespace-nowrap">{coupon.email || "—"}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-700 text-xs whitespace-nowrap">{formatPlan(coupon.coupon_valid_on_plan_id)}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-700 text-xs whitespace-nowrap">{formatPlan(coupon.user_register_on_plan_id)}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-700 text-xs whitespace-nowrap">{coupon.updated_plan_id ? formatPlan(coupon.updated_plan_id) : "—"}</td>
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
                        <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
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
          {!loading && !error && view === "cards" && (
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
                          <span className="text-gray-500">Email</span>
                          <span className="text-gray-900 truncate ml-2 max-w-[200px]">{coupon.email || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Coupon Valid For</span>
                          <span className="text-gray-900 text-xs">{formatPlan(coupon.coupon_valid_on_plan_id)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Registered On</span>
                          <span className="text-gray-900 text-xs">{formatPlan(coupon.user_register_on_plan_id)}</span>
                        </div>
                        {coupon.updated_plan_id && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Updated Plan</span>
                            <span className="text-gray-900 text-xs">{formatPlan(coupon.updated_plan_id)}</span>
                          </div>
                        )}
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
          {!loading && !error && totalPages > 1 && (
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
