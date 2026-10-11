/**
 * Words shown under the spinner when something takes a while. One line at a time; each
 * list ends with "Almost there…", which stays until the wait is over.
 */
const ALMOST = "Almost there…";

export const LOADING_MESSAGES = {
  page: [
    "Opening…",
    "Fetching your records…",
    "Putting things in date order…",
    "Getting the latest values…",
    ALMOST,
  ],
  upload: [
    "Uploading your file…",
    "Checking the photo is sharp…",
    "Straightening the page…",
    "Reading the report…",
    "Reading it again to double-check…",
    "Finding the test results…",
    "Recognising each test…",
    "Checking values against ranges…",
    "Finding the date and the lab…",
    "Saving your results…",
    ALMOST,
  ],
  assistant: [
    "Reading your question…",
    "Looking through your records…",
    "Finding the reports that matter…",
    "Checking dates and values…",
    "Writing your answer…",
    "Double-checking against your records…",
    ALMOST,
  ],
  save: ["Saving…", "Checking everything is in order…", "Updating your timeline…", ALMOST],
  signIn: ["Signing you in…", "Checking your details…", "Opening your file…", ALMOST],
  signUp: ["Creating your account…", "Securing your password…", "Setting up your file…", ALMOST],
  aiKey: ["Checking your key…", "Talking to the AI service…", "Encrypting your key…", ALMOST],
  export: [
    "Collecting your records…",
    "Adding your lab results…",
    "Adding your readings…",
    "Preparing your download…",
    ALMOST,
  ],
  chart: ["Drawing your chart…", "Plotting each result…", ALMOST],
  document: ["Opening the document…", "Loading the pages…", ALMOST],
  import: ["Reading your spreadsheet…", "Checking each row…", "Saving your readings…", ALMOST],
  email: ["Sending the email…", ALMOST],
  signOut: ["Signing you out…", ALMOST],
  delete: ["Deleting…", "Updating your timeline…", ALMOST],
} as const satisfies Record<string, readonly string[]>;

export type LoadingKind = keyof typeof LOADING_MESSAGES;
