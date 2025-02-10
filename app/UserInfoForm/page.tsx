import React, { useState } from "react";
import { motion } from "framer-motion";
import { FaCheckCircle, FaRegCircle, FaRegDotCircle } from "react-icons/fa";
import { updateUserData, UserFormData } from "../api/userForm.api";
interface UserInfoFormProps {
  onClose: () => void;
}

export const UserInfoForm = ({ onClose }: UserInfoFormProps) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    sex: "",
    age: "",
    height: "",
    hypertension: "",
    painLevel: "",
    diabetes: "",
    bmi: "",
    mobility: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string>("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const totalSteps = 3;

  const isStepValid = () => {
    if (step === 1) {
      return formData.sex && formData.age && formData.height;
    } else if (step === 2) {
      return formData.hypertension && formData.painLevel && formData.diabetes;
    } else if (step === 3) {
      return formData.bmi && formData.mobility;
    }
    return false;
  };

  const nextStep = () => {
    if (isStepValid()) {
      setStep((prev) => prev + 1);
    }
  };

  const prevStep = () => setStep((prev) => prev - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare the data for submission (Mapping formData to UserFormData structure)
    const userData: UserFormData = {
      name: "", // This will need to come from somewhere (maybe another field or API)
      username: "", // Same as above
      email: "", // Same as above
      sex: formData.sex,
      age: Number(formData.age),
      height: Number(formData.height),
      hypertension: formData.hypertension,
      diabetes: formData.diabetes,
      bmi: Number(formData.bmi),
      pain_level: formData.painLevel,
      pain_category: formData.painLevel, // Assuming pain_level and pain_category are the same, adjust if needed
    };

    setIsSubmitting(true);
    try {
      const responseMessage = await updateUserData(userData); // API call to update the user data
      setSubmitMessage(responseMessage); // Show success message
      onClose();
    } catch (error) {
      setSubmitMessage("Error submitting form. Please try again later.");
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  return (
    <div className="relative bg-slate-800 p-8 rounded-3xl shadow-xl w-full max-w-lg border border-gray-600 overflow-hidden">
      <div className="absolute inset-0 bg-black opacity-70 blur-md z-10"></div>

      <h2 className="text-3xl font-semibold text-gray-200 mb-6 text-center relative z-20">
        Patient Information
      </h2>

      {/* Progress Bar */}
      <div className="relative z-20 mb-6">
        <ul className="flex justify-between text-sm text-gray-300 items-center">
          <li
            className={`flex items-center gap-2 ${
              step === 1 ? "font-bold text-white" : ""
            }`}
          >
            {step > 1 ? (
              <FaCheckCircle className="text-green-500" />
            ) : (
              <FaRegCircle className="text-indigo-500" />
            )}
            Step 1
          </li>
          <li
            className={`flex items-center gap-2 ${
              step === 2 ? "font-bold text-white" : ""
            }`}
          >
            {step > 2 ? (
              <FaCheckCircle className="text-green-500" />
            ) : (
              <FaRegCircle className="text-indigo-500" />
            )}
            Step 2
          </li>
          <li
            className={`flex items-center gap-2 ${
              step === 3 ? "font-bold text-white" : ""
            }`}
          >
            {step === 3 ? (
              <FaRegDotCircle className="text-indigo-500" />
            ) : (
              <FaRegCircle className="text-indigo-500" />
            )}
            Step 3
          </li>
        </ul>
        <div className="progress mt-2 h-1 bg-gray-600 rounded">
          <div
            className="h-full bg-indigo-500 transition-all"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8 relative z-20">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {step === 1 && (
            <>
              <div className="mb-6">
                <label className="text-gray-300 text-sm font-medium block">
                  Sex:
                </label>
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleChange}
                  className="w-full px-6 py-3 rounded-md bg-slate-900 text-gray-300 border border-gray-600"
                  required
                >
                  <option value="">Select</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="text-gray-300 text-sm font-medium block">
                  Age:
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className="w-full px-6 py-3 rounded-md bg-slate-900 text-gray-300 border border-gray-600"
                  placeholder="Enter Age"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="text-gray-300 text-sm font-medium block">
                  Height (cm):
                </label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  className="w-full px-6 py-3 rounded-md bg-slate-900 text-gray-300 border border-gray-600"
                  placeholder="Enter Height in cm"
                  required
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-6">
                <label className="text-gray-300 text-sm font-medium block">
                  Hypertension:
                </label>
                <select
                  name="hypertension"
                  value={formData.hypertension}
                  onChange={handleChange}
                  className="w-full px-6 py-3 rounded-md bg-slate-900 text-gray-300 border border-gray-600"
                  required
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="text-gray-300 text-sm font-medium block">
                  Pain Level:
                </label>
                <select
                  name="painLevel"
                  value={formData.painLevel}
                  onChange={handleChange}
                  className="w-full px-6 py-3 rounded-md bg-slate-900 text-gray-300 border border-gray-600"
                  required
                >
                  <option value="">Select</option>
                  <option value="Chronic">Chronic</option>
                  <option value="Acute">Acute</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="text-gray-300 text-sm font-medium block">
                  Diabetes:
                </label>
                <select
                  name="diabetes"
                  value={formData.diabetes}
                  onChange={handleChange}
                  className="w-full px-6 py-3 rounded-md bg-slate-900 text-gray-300 border border-gray-600"
                  required
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes (Diabetic)</option>
                  <option value="No">No (None or Borderline)</option>
                </select>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="mb-6">
                <label className="text-gray-300 text-sm font-medium block">
                  BMI:
                </label>
                <input
                  type="number"
                  name="bmi"
                  value={formData.bmi}
                  onChange={handleChange}
                  className="w-full px-6 py-3 rounded-md bg-slate-900 text-gray-300 border border-gray-600"
                  placeholder="Enter BMI"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="text-gray-300 text-sm font-medium block">
                  Mobility:
                </label>
                <select
                  name="mobility"
                  value={formData.mobility}
                  onChange={handleChange}
                  className="w-full px-6 py-3 rounded-md bg-slate-900 text-gray-300 border border-gray-600"
                  required
                >
                  {" "}
                  <option value="">Select</option>
                  <option value="Immovable">Immovable</option>
                  <option value="On your feet">On your feet</option>
                  <option value="Almost Perfect">Almost Perfect</option>
                </select>
              </div>
            </>
          )}
        </motion.div>

        <div className="flex justify-between mt-8">
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="px-6 py-3 rounded-md bg-gray-700 text-gray-300"
            >
              Previous
            </button>
          )}

          <div>
            {step < totalSteps && (
              <button
                type="button"
                onClick={nextStep}
                className={`${
                  isStepValid() ? "bg-indigo-500" : "bg-gray-500"
                } px-6 py-3 rounded-md text-gray-300`}
                disabled={!isStepValid()}
              >
                Next
              </button>
            )}

            {step === totalSteps && (
              <button
                type="submit"
                className={`${
                  isSubmitting ? "bg-gray-600" : "bg-indigo-500"
                } px-6 py-3 rounded-md text-gray-300`}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            )}
          </div>
        </div>

        {submitMessage && (
          <div className="mt-6 text-center text-gray-200">{submitMessage}</div>
        )}
      </form>
    </div>
  );
};
