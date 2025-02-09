import React, { useState } from "react";
import { motion } from "framer-motion";
import { FaCheckCircle, FaRegCircle, FaRegDotCircle } from "react-icons/fa";

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form Submitted:", formData);
    onClose();
  };

  const totalSteps = 3;

  return (
    <div className="relative bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-lg border border-gray-600 overflow-hidden">
      {/* Background blur */}
      <div className="absolute inset-0 bg-black opacity-70 blur-md z-10"></div>

      <h2 className="text-2xl font-semibold text-white mb-6 text-center relative z-20">
        Patient Information
      </h2>

      {/* Progress Bar with Icons for Steps */}
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
        <p className="text-center mt-2 text-gray-400">
          Step {step} of {totalSteps}
        </p>
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
                  className="w-full px-4 py-3 rounded-md bg-slate-900 text-white border border-gray-600"
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
                  className="w-full px-4 py-3 rounded-md bg-slate-900 text-white border border-gray-600"
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
                  className="w-full px-4 py-3 rounded-md bg-slate-900 text-white border border-gray-600"
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
                  className="w-full px-4 py-3 rounded-md bg-slate-900 text-white border border-gray-600"
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
                  className="w-full px-4 py-3 rounded-md bg-slate-900 text-white border border-gray-600"
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
                  className="w-full px-4 py-3 rounded-md bg-slate-900 text-white border border-gray-600"
                  required
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
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
                  className="w-full px-4 py-3 rounded-md bg-slate-900 text-white border border-gray-600"
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
                  className="w-full px-4 py-3 rounded-md bg-slate-900 text-white border border-gray-600"
                  required
                >
                  <option value="">Select Pain Level</option>
                  <option value="Almost Perfect">
                    <option value="Immovable">Severe Pain (Unbearable)</option>
                    (Minimal Pain)
                  </option>
                  <option value="On your feet">
                    On your feet (Manageable)
                  </option>
                  <option value="Immovable">Immovable (Unbearable)</option>
                </select>
              </div>
            </>
          )}
        </motion.div>

        <div className="flex justify-between mt-8">
          {step > 1 && (
            <button
              onClick={prevStep}
              className="btn px-6 py-3 bg-indigo-500 text-white rounded-md"
            >
              Previous
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={nextStep}
              className="btn px-6 py-3 bg-indigo-500 text-white rounded-md"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              className="btn px-6 py-3 bg-green-500 text-white rounded-md"
            >
              Submit
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
