"use client";

import {
  PRESETS,
  VOICES,
  blankBusiness,
  clonePreset,
  isBusinessReady,
  type BusinessProfile,
} from "@/lib/business";

type Props = {
  draft: BusinessProfile;
  onChange: (next: BusinessProfile) => void;
  onSave: () => void;
  onCancel?: () => void;
  mode: "create" | "edit";
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]/80">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--harbor)]";

export default function BusinessSetup({
  draft,
  onChange,
  onSave,
  onCancel,
  mode,
}: Props) {
  const ready = isBusinessReady(draft);

  function patch(partial: Partial<BusinessProfile>) {
    onChange({ ...draft, ...partial });
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      {mode === "create" && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--ink-soft)]">
            Start from a template, or fill in your own business.
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange(clonePreset(preset))}
                className="rounded-full border border-[var(--line)] bg-white/55 px-3 py-1.5 text-sm text-[var(--ink-soft)] transition hover:border-[var(--harbor)] hover:bg-white/85"
              >
                {preset.kind}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onChange(blankBusiness())}
              className="rounded-full border border-dashed border-[var(--line)] px-3 py-1.5 text-sm text-[var(--ink-soft)]"
            >
              Blank
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name">
          <input
            className={inputClass}
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Acme Dental"
          />
        </Field>
        <Field label="Business type">
          <input
            className={inputClass}
            value={draft.kind}
            onChange={(e) => patch({ kind: e.target.value })}
            placeholder="clinic, salon, shop…"
          />
        </Field>
        <Field label="Desk label">
          <input
            className={inputClass}
            value={draft.phoneLabel}
            onChange={(e) => patch({ phoneLabel: e.target.value })}
            placeholder="front desk"
          />
        </Field>
        <Field label="Voice">
          <select
            className={inputClass}
            value={draft.voiceId}
            onChange={(e) => patch({ voiceId: e.target.value })}
          >
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} — {v.vibe}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Address">
          <input
            className={inputClass}
            value={draft.address}
            onChange={(e) => patch({ address: e.target.value })}
            placeholder="123 Main St"
          />
        </Field>
        <Field label="Wifi (optional)">
          <input
            className={inputClass}
            value={draft.wifi ?? ""}
            onChange={(e) => patch({ wifi: e.target.value })}
            placeholder="GuestWifi"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Weekday hours">
          <input
            className={inputClass}
            value={draft.hours.weekdays}
            onChange={(e) =>
              patch({ hours: { ...draft.hours, weekdays: e.target.value } })
            }
          />
        </Field>
        <Field label="Saturday">
          <input
            className={inputClass}
            value={draft.hours.saturday}
            onChange={(e) =>
              patch({ hours: { ...draft.hours, saturday: e.target.value } })
            }
          />
        </Field>
        <Field label="Sunday">
          <input
            className={inputClass}
            value={draft.hours.sunday}
            onChange={(e) =>
              patch({ hours: { ...draft.hours, sunday: e.target.value } })
            }
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Offerings label">
          <input
            className={inputClass}
            value={draft.offerings.label}
            onChange={(e) =>
              patch({
                offerings: { ...draft.offerings, label: e.target.value },
              })
            }
            placeholder="services / menu"
          />
        </Field>
        <Field label="Price note (optional)">
          <input
            className={inputClass}
            value={draft.offerings.priceNote ?? ""}
            onChange={(e) =>
              patch({
                offerings: { ...draft.offerings, priceNote: e.target.value },
              })
            }
          />
        </Field>
      </div>

      <Field label="Offerings (one per line)">
        <textarea
          className={`${inputClass} min-h-24`}
          value={draft.offerings.items.join("\n")}
          onChange={(e) =>
            patch({
              offerings: {
                ...draft.offerings,
                items: e.target.value.split("\n"),
              },
            })
          }
          placeholder={"haircuts\ncolor\nblowouts"}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Booking noun">
          <input
            className={inputClass}
            value={draft.booking.noun}
            onChange={(e) =>
              patch({ booking: { ...draft.booking, noun: e.target.value } })
            }
            placeholder="appointment"
          />
        </Field>
        <Field label="Max party">
          <input
            type="number"
            min={1}
            className={inputClass}
            value={draft.booking.partyMax}
            onChange={(e) =>
              patch({
                booking: {
                  ...draft.booking,
                  partyMax: Number(e.target.value) || 1,
                },
              })
            }
          />
        </Field>
        <Field label="Lead hours">
          <input
            type="number"
            min={0}
            className={inputClass}
            value={draft.booking.leadHours}
            onChange={(e) =>
              patch({
                booking: {
                  ...draft.booking,
                  leadHours: Number(e.target.value) || 0,
                },
              })
            }
          />
        </Field>
      </div>

      <Field label="Booking note (optional)">
        <input
          className={inputClass}
          value={draft.booking.note}
          onChange={(e) =>
            patch({ booking: { ...draft.booking, note: e.target.value } })
          }
        />
      </Field>

      <Field label="Pitch (spoken after the greeting)">
        <textarea
          className={`${inputClass} min-h-24`}
          value={draft.pitch ?? ""}
          onChange={(e) => patch({ pitch: e.target.value })}
          placeholder="Optional. Example: We're a neighborhood café known for pour-overs and quiet tables — spoken right after the greeting, and when callers ask what you do."
        />
      </Field>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          disabled={!ready}
          onClick={onSave}
          className="rounded-full bg-[var(--harbor)] px-6 py-3 text-sm font-medium text-[var(--foam)] disabled:opacity-40"
        >
          {mode === "create" ? "Save business & open desk" : "Save changes"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--line)] px-5 py-3 text-sm text-[var(--ink-soft)]"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
