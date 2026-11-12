"use client";

import { fetchResponse } from '@/lib/client-request';

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CityOption, DataRecord } from "@/lib/dashboard-types";

import BoxCoordinateFields from './box-coordinate-fields';

type BoxRegistrationFormProps = {
  cities: CityOption[];
  partners: DataRecord[];
  users: DataRecord[];
  riders: DataRecord[];
  fixedCityId?: string | null;
};

export default function BoxRegistrationForm({ cities, partners, users, riders, fixedCityId }: BoxRegistrationFormProps) {
  const router = useRouter();
  const [cityId, setCityId] = useState(fixedCityId || cities[0]?.city_id || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const cityPartners = partners.filter((item) => !item.city_id || item.city_id === cityId);
  const cityStaff = users.filter((item) => item.identity_type === "field_staff" && (!item.city_id || item.city_id === cityId));
  const cityRiders = riders.filter((item) => !item.city_id || item.city_id === cityId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSuccess(""); setBusy(true);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetchResponse("/api/dashboard/boxes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, cityId }),
      });
      const result = await response.json() as { boxId?: string; error?: string };
      if (!response.ok || !result.boxId) throw new Error(result.error || "Could not register the box.");
      setSuccess(`Box ${result.boxId} is registered and active.`);
      form.reset();
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not register the box.");
    } finally { setBusy(false); }
  }

  return <details className="mb-6 rounded-2xl border border-[#dce8dc] bg-white shadow-[0_3px_14px_rgba(28,52,33,.035)]">
    <summary className="cursor-pointer list-none px-5 py-4 font-bold text-[#203526] marker:hidden">Register a donation box <span className="ml-2 text-sm font-normal text-[#718073]">Create an active box record with its city, location, and responsible people.</span></summary>
    <form onSubmit={submit} className="grid gap-4 border-t border-[#e9efe7] p-5 sm:grid-cols-2 xl:grid-cols-3">
      <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">Box ID<span className="flex h-10 items-center rounded-lg border border-[#dce8dc] bg-[#f5faf2] px-3 text-sm font-normal text-[#203526]">Generated automatically (DB-...)</span></label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">QR code<input name="qrCode" required minLength={3} maxLength={40} pattern="[A-Za-z0-9-]+" placeholder="QR-DB-0001" className="h-10 rounded-lg border border-[#dce8dc] px-3 text-sm font-normal text-[#203526]"/></label>
      {!fixedCityId && <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">City<select value={cityId} onChange={(event) => setCityId(event.target.value)} required className="h-10 rounded-lg border border-[#dce8dc] bg-white px-3 text-sm font-normal text-[#203526]"><option value="">Choose a city</option>{cities.map((city) => <option key={city.city_id} value={city.city_id}>{city.city_name}</option>)}</select></label>}
      <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">District<input name="district" maxLength={100} placeholder="e.g. Karachi East" className="h-10 rounded-lg border border-[#dce8dc] px-3 text-sm font-normal text-[#203526]"/></label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">Area<input name="area" required maxLength={100} placeholder="Neighborhood or zone" className="h-10 rounded-lg border border-[#dce8dc] px-3 text-sm font-normal text-[#203526]"/></label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">Location type<input name="locationType" required maxLength={40} placeholder="Mosque, shop, home..." className="h-10 rounded-lg border border-[#dce8dc] px-3 text-sm font-normal text-[#203526]"/></label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">Installation date<input name="installationDate" type="date" required className="h-10 rounded-lg border border-[#dce8dc] px-3 text-sm font-normal text-[#203526]"/></label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">Security level<input name="securityLevel" required maxLength={32} placeholder="Standard" className="h-10 rounded-lg border border-[#dce8dc] px-3 text-sm font-normal text-[#203526]"/></label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">Partner <span className="text-[11px] font-normal">Optional</span><select name="partnerId" className="h-10 rounded-lg border border-[#dce8dc] bg-white px-3 text-sm font-normal text-[#203526]"><option value="">No partner assigned</option>{cityPartners.map((partner) => <option key={String(partner.partner_id)} value={String(partner.partner_id)}>{String(partner.partner_name)}</option>)}</select></label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">Field custodian <span className="text-[11px] font-normal">Optional</span><select name="custodianUserId" className="h-10 rounded-lg border border-[#dce8dc] bg-white px-3 text-sm font-normal text-[#203526]"><option value="">No custodian assigned</option>{cityStaff.map((user) => <option key={String(user.team_id)} value={String(user.team_id)}>{String(user.full_name)}</option>)}</select></label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">Assigned rider <span className="text-[11px] font-normal">Optional</span><select name="assignedRiderId" className="h-10 rounded-lg border border-[#dce8dc] bg-white px-3 text-sm font-normal text-[#203526]"><option value="">No rider assigned</option>{cityRiders.map((rider) => <option key={String(rider.rider_id)} value={String(rider.rider_id)}>{String(rider.rider_name)}</option>)}</select></label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#536455] sm:col-span-2 xl:col-span-3">Location details<textarea name="locationDescription" required maxLength={1000} rows={2} placeholder="Street address, landmarks, or access instructions" className="rounded-lg border border-[#dce8dc] p-3 text-sm font-normal text-[#203526]"/></label>
      <div className="sm:col-span-2 xl:col-span-3"><BoxCoordinateFields disabled={busy}/></div>
      {error && <p role="alert" className="text-sm text-[#913a34] sm:col-span-2 xl:col-span-3">{error}</p>}
      {success && <p role="status" className="text-sm text-[#276431] sm:col-span-2 xl:col-span-3">{success}</p>}
      <div className="sm:col-span-2 xl:col-span-3"><button disabled={busy || !cityId} className="h-10 rounded-lg bg-[#276431] px-4 text-sm font-semibold text-white hover:bg-[#1f5129] disabled:opacity-50">{busy ? "Registering…" : "Register active box"}</button></div>
    </form>
  </details>;
}
