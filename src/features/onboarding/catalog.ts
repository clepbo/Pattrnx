/**
 * Defaults offered at onboarding (PRD F2, assumption 4). Users can rename,
 * archive or add to all of these later.
 */

export type Polarity = "desired" | "undesired" | "neutral";

export interface StarterActivityType {
  name: string;
  polarity: Polarity;
  /** "currency" means the user's profile currency. */
  unit?: "currency" | "minutes";
}

export interface DefaultLifeArea {
  name: string;
  preselected: boolean;
  starters: StarterActivityType[];
}

export const DEFAULT_LIFE_AREAS: readonly DefaultLifeArea[] = [
  {
    name: "Career",
    preselected: true,
    starters: [
      { name: "Deep work", polarity: "desired", unit: "minutes" },
      { name: "Job applications", polarity: "desired" },
      { name: "Networking", polarity: "desired" },
    ],
  },
  {
    name: "Finance",
    preselected: true,
    starters: [
      { name: "Saving", polarity: "desired", unit: "currency" },
      { name: "Discretionary spending", polarity: "undesired", unit: "currency" },
    ],
  },
  {
    name: "Health",
    preselected: true,
    starters: [
      { name: "Exercise", polarity: "desired", unit: "minutes" },
      { name: "Healthy meal", polarity: "desired" },
    ],
  },
  {
    name: "Emotional wellbeing",
    preselected: false,
    starters: [
      { name: "Journaling", polarity: "desired" },
      { name: "Rest and recovery", polarity: "desired", unit: "minutes" },
    ],
  },
  {
    name: "Relationships",
    preselected: false,
    starters: [
      { name: "Time with friends", polarity: "desired" },
      { name: "Family time", polarity: "desired" },
    ],
  },
  {
    name: "Learning",
    preselected: true,
    starters: [
      { name: "Study", polarity: "desired", unit: "minutes" },
      { name: "Reading", polarity: "desired", unit: "minutes" },
    ],
  },
  {
    name: "Personal development",
    preselected: false,
    starters: [{ name: "Reflection", polarity: "desired" }],
  },
  {
    name: "Spirituality",
    preselected: false,
    starters: [{ name: "Prayer or meditation", polarity: "desired", unit: "minutes" }],
  },
  {
    name: "Productivity",
    preselected: false,
    starters: [
      { name: "Planning", polarity: "desired" },
      { name: "Late-night scrolling", polarity: "undesired", unit: "minutes" },
    ],
  },
  {
    name: "Lifestyle",
    preselected: false,
    starters: [{ name: "Hobby time", polarity: "desired", unit: "minutes" }],
  },
];

export const STARTER_SEPARATOR = "::";

export function starterKey(area: string, starter: string): string {
  return `${area}${STARTER_SEPARATOR}${starter}`;
}

export const CURRENCIES = [
  { value: "NGN", label: "NGN — Nigerian naira" },
  { value: "GHS", label: "GHS — Ghanaian cedi" },
  { value: "KES", label: "KES — Kenyan shilling" },
  { value: "ZAR", label: "ZAR — South African rand" },
  { value: "EGP", label: "EGP — Egyptian pound" },
  { value: "USD", label: "USD — US dollar" },
  { value: "GBP", label: "GBP — British pound" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "CAD", label: "CAD — Canadian dollar" },
  { value: "AUD", label: "AUD — Australian dollar" },
  { value: "INR", label: "INR — Indian rupee" },
] as const;

export const WEEKDAYS = [
  { value: "1", label: "Monday" },
  { value: "0", label: "Sunday" },
  { value: "6", label: "Saturday" },
] as const;
