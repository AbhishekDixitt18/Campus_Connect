const { useState } = React;

const API_BASE = "http://127.0.0.1:4000/api";

function SignupPage() {
  const totalSteps = 5;
  const stepTitles = [
    "Choose your role",
    "Academic details",
    "Email and password",
    "Email authentication",
    "Choose username"
  ];

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    accountType: "",
    firstName: "",
    lastName: "",
    regNo: "",
    programOrUnit: "",
    yearOrDesignation: "",
    email: "",
    department: "",
    password: "",
    confirmPassword: "",
    username: "",
    consent: false
  });
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [signupProofToken, setSignupProofToken] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "idle" });

  const departments = [
    "Computer Science & Engineering",
    "Information Technology",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Management",
    "Other"
  ];

  const reservedUsernames = ["admin", "support", "campusconnect", "events", "root"];

  function handleInput(event) {
    const { name, type, checked, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));

    if (name === "email") {
      setIsEmailVerified(false);
      setIsCodeSent(false);
      setSignupProofToken("");
      setOtpDigits(["", "", "", "", "", ""]);
    }
  }

  function handleOtpChange(index, rawValue) {
    const value = rawValue.replace(/\D/g, "").slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  function handleOtpKeyDown(index, event) {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
      }
    }
  }

  function handleOtpPaste(event) {
    event.preventDefault();
    const pasted = (event.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (!pasted) {
      return;
    }

    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i += 1) {
      next[i] = pasted[i];
    }
    setOtpDigits(next);

    const focusIndex = Math.min(pasted.length, 5);
    const targetInput = document.getElementById(`otp-${focusIndex}`);
    if (targetInput) {
      targetInput.focus();
    }
  }

  function setError(text) {
    setMessage({ text, type: "error" });
  }

  function setSuccess(text) {
    setMessage({ text, type: "success" });
  }

  function validateStep(currentStep) {
    if (currentStep === 1) {
      if (!formData.accountType) {
        return "Please choose Student or Organizer to continue.";
      }
      return "";
    }

    if (currentStep === 2) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        return "Please enter your full name.";
      }

      if (!/^[A-Za-z0-9-]{6,14}$/.test(formData.regNo.trim())) {
        return "Registration ID should be 6 to 14 characters (letters, numbers, hyphen).";
      }

      if (!formData.department) {
        return "Please select your department.";
      }

      if (!formData.programOrUnit.trim()) {
        return formData.accountType === "Student"
          ? "Please enter your program name."
          : "Please enter your organizing unit.";
      }

      if (!formData.yearOrDesignation.trim()) {
        return formData.accountType === "Student"
          ? "Please enter your study year/semester."
          : "Please enter your designation.";
      }
      return "";
    }

    if (currentStep === 3) {
      if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
        return "Please use a valid official institution email address.";
      }

      if (formData.password.length < 8) {
        return "Password must be at least 8 characters.";
      }

      if (formData.password !== formData.confirmPassword) {
        return "Passwords do not match.";
      }

      if (!formData.consent) {
        return "Please accept the terms to continue.";
      }
      return "";
    }

    if (currentStep === 4) {
      if (!isCodeSent) {
        return "Please send the verification code to your email first.";
      }
      if (!isEmailVerified || !signupProofToken) {
        return "Please verify your email code before continuing.";
      }
      return "";
    }

    if (currentStep === 5) {
      const username = formData.username.trim().toLowerCase();
      if (!/^[a-z0-9_]{4,16}$/.test(username)) {
        return "Username must be 4-16 characters, lowercase letters, numbers, or underscore.";
      }
      if (reservedUsernames.includes(username)) {
        return "That username is reserved. Please choose another one.";
      }
      return "";
    }

    return "";
  }

  function goNext() {
    const error = validateStep(step);
    if (error) {
      setError(error);
      return;
    }

    setMessage({ text: "", type: "idle" });
    setStep((prev) => Math.min(totalSteps, prev + 1));
  }

  function goBack() {
    setMessage({ text: "", type: "idle" });
    setStep((prev) => Math.max(1, prev - 1));
  }

  async function sendVerificationCode() {
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      setError("Enter a valid official email before requesting a code.");
      return;
    }

    try {
      setIsBusy(true);
      setMessage({ text: "", type: "idle" });

      const response = await fetch(`${API_BASE}/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim().toLowerCase() })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Could not send verification code.");
        return;
      }

      setIsCodeSent(true);
      setIsEmailVerified(false);
      setSignupProofToken("");
      setOtpDigits(["", "", "", "", "", ""]);
      setSuccess("Verification code sent to your email.");
    } catch (_error) {
      setError("Network error while sending verification code.");
    } finally {
      setIsBusy(false);
    }
  }

  async function verifyCode() {
    if (!isCodeSent) {
      setError("Request a verification code first.");
      return;
    }

    const enteredCode = otpDigits.join("");
    if (enteredCode.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    try {
      setIsBusy(true);
      setMessage({ text: "", type: "idle" });

      const response = await fetch(`${API_BASE}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          code: enteredCode
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Could not verify code.");
        return;
      }

      setIsEmailVerified(true);
      setSignupProofToken(data.signupProofToken || "");
      setSuccess("Email verified successfully.");
    } catch (_error) {
      setError("Network error while verifying code.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const error = validateStep(5);
    if (error) {
      setError(error);
      return;
    }

    try {
      setIsBusy(true);
      setMessage({ text: "", type: "idle" });

      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signupProofToken,
          accountType: formData.accountType,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          regNo: formData.regNo.trim(),
          department: formData.department,
          programOrUnit: formData.programOrUnit.trim(),
          yearOrDesignation: formData.yearOrDesignation.trim(),
          email: formData.email.trim().toLowerCase(),
          username: formData.username.trim().toLowerCase(),
          password: formData.password
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Could not complete signup.");
        return;
      }

      setSuccess("Signup completed successfully. Your account has been created.");
      setStep(1);
      setIsEmailVerified(false);
      setIsCodeSent(false);
      setSignupProofToken("");
      setOtpDigits(["", "", "", "", "", ""]);
      setFormData({
        accountType: "",
        firstName: "",
        lastName: "",
        regNo: "",
        programOrUnit: "",
        yearOrDesignation: "",
        email: "",
        department: "",
        password: "",
        confirmPassword: "",
        username: "",
        consent: false
      });
    } catch (_error) {
      setError("Network error while creating account.");
    } finally {
      setIsBusy(false);
    }
  }

  const messageColor =
    message.type === "error"
      ? "text-[#ff8f9d]"
      : message.type === "success"
      ? "text-[#66f0cb]"
      : "text-[#9fb4dd]";

  return (
    <div className="min-h-screen bg-[linear-gradient(125deg,#050a1a,#0c1a3a)] p-3 md:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-[1200px] overflow-hidden rounded-[2rem] border border-[#ffffff1f] shadow-[0_35px_65px_rgba(5,10,24,0.6)] lg:grid-cols-2">
        <section className="relative">
          <img
            src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1400&q=80"
            alt="Students in a vibrant campus environment"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,11,24,0.1),rgba(7,11,24,0.78))]" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 animate-fadeUp">
            <p className="text-xs uppercase tracking-[0.14em] text-[#8df9e3]">Campus Connect</p>
            <h1 className="mt-2 max-w-[16ch] font-display text-4xl leading-tight md:text-5xl">Create your account and join the campus event network.</h1>
            <p className="mt-4 max-w-[50ch] text-sm text-[#d6e6ff] md:text-base">
              Discover events, register instantly, and stay updated with one unified platform.
            </p>
          </div>
        </section>

        <section className="flex min-h-0 flex-col bg-[linear-gradient(180deg,#0d1b3d,#08142d)] p-5 md:p-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-display text-xl font-semibold">Sign up</p>
              <p className="text-sm text-[#9fb4dd]">Step {step} of {totalSteps}: {stepTitles[step - 1]}</p>
            </div>
            <a href="index.html" className="text-sm text-[#76f4d5] underline underline-offset-4">Home</a>
          </div>

          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-[#22355f]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#27d1a6,#6ee7ff)] transition-all duration-500"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {step === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-[#c5d6fa]">Choose how you want to use Campus Connect.</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Student",
                      text: "Join events and track participation",
                      image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=700&q=80"
                    },
                    {
                      label: "Organizer",
                      text: "Create and manage campus events",
                      image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=700&q=80"
                    }
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, accountType: item.label }))}
                      className={`rounded-2xl border p-4 text-left transition ${
                        formData.accountType === item.label
                          ? "border-[#27d1a6] bg-[#123a4388]"
                          : "border-[#bed2ff3d] bg-[#040b1c95] hover:border-[#7ec9b6]"
                      }`}
                    >
                      <img
                        src={item.image}
                        alt={`${item.label} role preview`}
                        className="mb-3 h-24 w-full rounded-xl object-cover"
                      />
                      <p className="font-display text-lg text-[#f3f7ff]">{item.label}</p>
                      <p className="mt-1 text-xs text-[#9fb4dd]">{item.text}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-[#dfe9ff]">
                    First name
                    <input
                      className="mt-2 w-full rounded-xl border border-[#bed2ff3d] bg-[#040b1c95] px-3 py-3 text-[#f3f7ff] outline-none transition focus:border-[#27d1a6]"
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInput}
                      placeholder="Aarav"
                    />
                  </label>
                  <label className="text-sm text-[#dfe9ff]">
                    Last name
                    <input
                      className="mt-2 w-full rounded-xl border border-[#bed2ff3d] bg-[#040b1c95] px-3 py-3 text-[#f3f7ff] outline-none transition focus:border-[#27d1a6]"
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInput}
                      placeholder="Sharma"
                    />
                  </label>
                </div>

                <label className="mt-3 block text-sm text-[#dfe9ff]">
                  University registration ID
                  <input
                    className="mt-2 w-full rounded-xl border border-[#bed2ff3d] bg-[#040b1c95] px-3 py-3 text-[#f3f7ff] outline-none transition focus:border-[#27d1a6]"
                    type="text"
                    name="regNo"
                    value={formData.regNo}
                    onChange={handleInput}
                    placeholder="AB12-3456"
                  />
                </label>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-[#dfe9ff]">
                    Department
                    <select
                      className="mt-2 w-full rounded-xl border border-[#bed2ff3d] bg-[#040b1c95] px-3 py-3 text-[#f3f7ff] outline-none transition focus:border-[#27d1a6]"
                      name="department"
                      value={formData.department}
                      onChange={handleInput}
                    >
                      <option value="">Select department</option>
                      {departments.map((department) => (
                        <option key={department} value={department} className="text-[#0d1631]">{department}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm text-[#dfe9ff]">
                    {formData.accountType === "Student" ? "Program" : "Organizing Unit"}
                    <input
                      className="mt-2 w-full rounded-xl border border-[#bed2ff3d] bg-[#040b1c95] px-3 py-3 text-[#f3f7ff] outline-none transition focus:border-[#27d1a6]"
                      type="text"
                      name="programOrUnit"
                      value={formData.programOrUnit}
                      onChange={handleInput}
                      placeholder={formData.accountType === "Student" ? "B.Tech CSE" : "Tech Club"}
                    />
                  </label>
                </div>

                <label className="mt-3 block text-sm text-[#dfe9ff]">
                  {formData.accountType === "Student" ? "Year / Semester" : "Designation"}
                  <input
                    className="mt-2 w-full rounded-xl border border-[#bed2ff3d] bg-[#040b1c95] px-3 py-3 text-[#f3f7ff] outline-none transition focus:border-[#27d1a6]"
                    type="text"
                    name="yearOrDesignation"
                    value={formData.yearOrDesignation}
                    onChange={handleInput}
                    placeholder={formData.accountType === "Student" ? "3rd Year" : "Event Coordinator"}
                  />
                </label>
              </div>
            )}

            {step === 3 && (
              <div>
                <label className="block text-sm text-[#dfe9ff]">
                  Official email
                  <input
                    className="mt-2 w-full rounded-xl border border-[#bed2ff3d] bg-[#040b1c95] px-3 py-3 text-[#f3f7ff] outline-none transition focus:border-[#27d1a6]"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInput}
                    placeholder="you@university.edu"
                  />
                </label>

                <label className="mt-3 block text-sm text-[#dfe9ff]">
                  Password
                  <input
                    className="mt-2 w-full rounded-xl border border-[#bed2ff3d] bg-[#040b1c95] px-3 py-3 text-[#f3f7ff] outline-none transition focus:border-[#27d1a6]"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInput}
                    placeholder="At least 8 characters"
                  />
                </label>

                <label className="mt-3 block text-sm text-[#dfe9ff]">
                  Confirm password
                  <input
                    className="mt-2 w-full rounded-xl border border-[#bed2ff3d] bg-[#040b1c95] px-3 py-3 text-[#f3f7ff] outline-none transition focus:border-[#27d1a6]"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInput}
                    placeholder="Re-enter password"
                  />
                </label>

                <label className="mt-3 flex items-start gap-2 text-sm text-[#9fb4dd]">
                  <input
                    type="checkbox"
                    name="consent"
                    checked={formData.consent}
                    onChange={handleInput}
                    className="mt-1 h-4 w-4"
                  />
                  <span>I agree to the Terms and Privacy Policy.</span>
                </label>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-[#c5d6fa]">
                  Verify your email <span className="font-semibold text-white">{formData.email || "(not set)"}</span>
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={sendVerificationCode}
                    disabled={isBusy}
                    className="rounded-xl border border-[#76f4d57d] bg-[#123a4388] px-4 py-3 text-sm font-semibold text-[#7ef3d7] transition hover:brightness-110 sm:min-w-[190px]"
                  >
                    {isBusy ? "Sending..." : isCodeSent ? "Resend Code" : "Send Verification Code"}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={`otp-${index}`}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => handleOtpChange(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      className="h-12 w-11 rounded-xl border border-[#bed2ff3d] bg-[#040b1c95] text-center text-lg font-semibold text-[#f3f7ff] outline-none transition focus:border-[#27d1a6]"
                      aria-label={`OTP digit ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={verifyCode}
                  disabled={isBusy}
                  className="rounded-xl bg-[linear-gradient(135deg,#27d1a6,#34e5be)] px-4 py-3 font-semibold text-[#052a22] transition hover:brightness-105 sm:min-w-[180px]"
                >
                  {isBusy ? "Verifying..." : "Verify Email"}
                </button>

                <p className={`text-sm ${isEmailVerified ? "text-[#66f0cb]" : "text-[#9fb4dd]"}`}>
                  {isEmailVerified ? "Email has been verified." : "Email not verified yet."}
                </p>
              </div>
            )}

            {step === 5 && (
              <div>
                <label className="block text-sm text-[#dfe9ff]">
                  Choose a unique username
                  <input
                    className="mt-2 w-full rounded-xl border border-[#bed2ff3d] bg-[#040b1c95] px-3 py-3 text-[#f3f7ff] outline-none transition focus:border-[#27d1a6]"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInput}
                    placeholder="your_name123"
                  />
                </label>

                <p className="mt-2 text-xs text-[#9fb4dd]">
                  Use 4-16 characters with lowercase letters, numbers, or underscore.
                </p>
              </div>
            )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#2a3f6d] pt-4">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 1 || isBusy}
                className="rounded-xl border border-[#bed2ff3d] px-4 py-3 text-sm font-semibold text-[#dfe9ff] transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                Back
              </button>

              {step < totalSteps ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={isBusy}
                  className="rounded-xl bg-[linear-gradient(135deg,#27d1a6,#34e5be)] px-4 py-3 text-sm font-semibold text-[#052a22] transition hover:brightness-105"
                >
                  {isBusy ? "Please wait..." : "Next Step"}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isBusy}
                  className="rounded-xl bg-[linear-gradient(135deg,#27d1a6,#34e5be)] px-4 py-3 text-sm font-semibold text-[#052a22] transition hover:brightness-105"
                >
                  {isBusy ? "Creating Account..." : "Complete Signup"}
                </button>
              )}
            </div>

            <p className={`mt-3 min-h-[1.25rem] text-sm ${messageColor}`}>{message.text}</p>

            <p className="mt-2 pb-1 text-sm text-[#9fb4dd]">
              Already have an account? <a href="signin.html" className="text-[#76f4d5] underline underline-offset-4">Sign in</a>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<SignupPage />);
