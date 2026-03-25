"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface Campaign {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  start_on: string;
  end_on: string;
  created_at: string;
  updated_at: string;
}

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

export default function CampaignsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

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

  if (!authorized) return null;

  return (
    <>
      <Navbar />
      <div className="pt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          {/* Page Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Campaigns</h1>
            <p className="mt-1 text-sm text-gray-500">Select a campaign to view its coupons</p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
              {error}
            </div>
          )}

          {/* Campaigns Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/coupons/${campaign.id}`}
                  className="group rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300"
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
                </Link>
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
