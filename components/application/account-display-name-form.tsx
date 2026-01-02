"use client";

import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DisplayNameFormProps = {
  initialDisplayName: string;
};

type FormStatus = "idle" | "saving" | "saved" | "error";

export function AccountDisplayNameForm({
  initialDisplayName,
}: DisplayNameFormProps) {
  const inputId = "account-display-name";
  const initialTrimmed = useMemo(
    () => initialDisplayName.trim(),
    [initialDisplayName]
  );
  const [value, setValue] = useState(initialDisplayName);
  const [savedValue, setSavedValue] = useState(initialTrimmed);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const trimmedValue = value.trim();
  const isDirty = trimmedValue !== savedValue;
  const canSubmit = trimmedValue.length > 0 && isDirty && status !== "saving";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!trimmedValue) {
      setStatus("error");
      setMessage("Add a display name to continue.");
      return;
    }

    setStatus("saving");
    setMessage(null);

    try {
      const response = await fetch("/account/display-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: trimmedValue }),
      });
      const payload = (await response.json()) as
        | { displayName?: string; error?: string }
        | undefined;

      if (!response.ok) {
        setStatus("error");
        setMessage(payload?.error || "Unable to update display name.");
        return;
      }

      const nextName = payload?.displayName?.trim() || trimmedValue;
      setValue(nextName);
      setSavedValue(nextName);
      setStatus("saved");
      setMessage("Saved.");
    } catch {
      setStatus("error");
      setMessage("Unable to update display name.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3"
      data-control="display-name-form"
    >
      <div className="space-y-2">
        <label
          htmlFor={inputId}
          className="text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]"
        >
          Display name
        </label>
        <Input
          id={inputId}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (status !== "idle") {
              setStatus("idle");
              setMessage(null);
            }
          }}
          placeholder="Add your name"
          name="displayName"
          autoComplete="name"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={!canSubmit}>
          {status === "saving" ? "Saving..." : "Save"}
        </Button>
        {message && (
          <p
            className="text-xs text-[color:var(--page-muted)]"
            aria-live="polite"
          >
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
