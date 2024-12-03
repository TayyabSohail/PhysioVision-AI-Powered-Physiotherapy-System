"use client";

import { useState } from "react";
import useMasonry from "@/utils/useMasonry";
import Image, { StaticImageData } from "next/image";
import TestimonialImg01 from "@/public/images/testimonial-01.jpg";
import TestimonialImg02 from "@/public/images/testimonial-02.jpg";
import TestimonialImg03 from "@/public/images/testimonial-03.jpg";
import TestimonialImg04 from "@/public/images/testimonial-04.jpg";
import TestimonialImg05 from "@/public/images/testimonial-05.jpg";
import TestimonialImg07 from "@/public/images/testimonial-07.jpg";

const testimonials = [
  {
    img: TestimonialImg01,
    name: "MaKayla P.",
    content:
      "As a fitness enthusiast, the Chatbot Vision Model on the web app has been a game-changer. It gives real-time posture corrections and adjustments during exercises.",
    categories: [1, 2, 3],
  },
  {
    img: TestimonialImg02,
    name: "Andrew K.",
    content:
      "I’ve used several fitness apps, but this one stands out. The chatbot offers personalized feedback in both English and Urdu, making it feel tailored to me.",
    categories: [1, 2],
  },
  {
    img: TestimonialImg03,
    name: "Lucy D.",
    content:
      "Tracking my exercises is easier with this web app. The AI provides instant corrections and progress reports after each session, making workouts more effective.",
    categories: [1, 3],
  },
  {
    img: TestimonialImg04,
    name: "Pavel M.",
    content:
      "As a trainer, this web app is invaluable. It gives real-time corrections and generates insightful reports for my clients, helping them improve faster.",
    categories: [],
  },
  {
    img: TestimonialImg05,
    name: "Miriam E.",
    content:
      "The Chatbot Vision Model on this web app tracks my posture, offers nutrition plans, and monitors meal content instantly. It's like having a fitness coach in my browser!",
    categories: [1, 3, 4],
  },
  {
    img: TestimonialImg07,
    name: "Eloise V.",
    content:
      "The guidance from this web app is unmatched. It tracks posture, offers personalized nutrition plans, and gives detailed progress reports. A must-have for anyone serious about fitness!",
    categories: [1, 4],
  },
];

export default function Testimonials() {
  const masonryContainer = useMasonry();
  const [category, setCategory] = useState<number>(1);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="border-t py-12 [border-image:linear-gradient(to_right,transparent,theme(colors.slate.400/.25),transparent)1] md:py-20">
        {/* Section header */}
        <div className="mx-auto max-w-3xl pb-12 text-center">
          <h2 className="animate-[gradient_6s_linear_infinite] bg-[linear-gradient(to_right,theme(colors.gray.200),theme(colors.indigo.200),theme(colors.gray.50),theme(colors.indigo.300),theme(colors.gray.200))] bg-[length:200%_auto] bg-clip-text pb-4 font-nacelle text-3xl font-semibold text-transparent md:text-4xl">
            Don’t Take Our Word for It{" "}
          </h2>
        </div>

        <div>
          {/* Buttons */}
          <div className="flex justify-center pb-12 max-md:hidden md:pb-16">
            <div className="relative inline-flex flex-wrap justify-center rounded-[1.25rem] bg-gray-800/40 p-1">
              {/* Button #1 */}
              <button
                className={`flex h-8 flex-1 items-center gap-2.5 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring focus-visible:ring-indigo-200 ${
                  category === 1
                    ? "relative bg-gradient-to-b from-gray-900 via-gray-800/60 to-gray-900 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-transparent before:[background:linear-gradient(to_bottom,theme(colors.indigo.500/0),theme(colors.indigo.500/.5))_border-box] before:[mask-composite:exclude_!important] before:[mask:linear-gradient(white_0_0)_padding-box,_linear-gradient(white_0_0)]"
                    : "opacity-65 transition-opacity hover:opacity-90"
                }`}
                aria-pressed={category === 1}
                onClick={() => setCategory(1)}
              >
                <span>View All</span>
              </button>
              {/* Button #2 */}
              <button
                className={`flex h-8 flex-1 items-center gap-2.5 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring focus-visible:ring-indigo-200 ${
                  category === 2
                    ? "relative bg-gradient-to-b from-gray-900 via-gray-800/60 to-gray-900 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-transparent before:[background:linear-gradient(to_bottom,theme(colors.indigo.500/0),theme(colors.indigo.500/.5))_border-box] before:[mask-composite:exclude_!important] before:[mask:linear-gradient(white_0_0)_padding-box,_linear-gradient(white_0_0)]"
                    : "opacity-65 transition-opacity hover:opacity-90"
                }`}
                aria-pressed={category === 2}
                onClick={() => setCategory(2)}
              >
                <span>Chatbot</span>
              </button>
              {/* Button #3 */}
              <button
                className={`flex h-8 flex-1 items-center gap-2.5 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring focus-visible:ring-indigo-200 ${
                  category === 3
                    ? "relative bg-gradient-to-b from-gray-900 via-gray-800/60 to-gray-900 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-transparent before:[background:linear-gradient(to_bottom,theme(colors.indigo.500/0),theme(colors.indigo.500/.5))_border-box] before:[mask-composite:exclude_!important] before:[mask:linear-gradient(white_0_0)_padding-box,_linear-gradient(white_0_0)]"
                    : "opacity-65 transition-opacity hover:opacity-90"
                }`}
                aria-pressed={category === 3}
                onClick={() => setCategory(3)}
              >
                <span>Posture</span>
              </button>
            </div>
          </div>

          {/* Testimonials */}
          <div
            className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
            ref={masonryContainer}
          >
            {testimonials
              .filter((testimonial) =>
                testimonial.categories.includes(category)
              )
              .map((testimonial, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center max-w-xs p-4 bg-slate-950 rounded-lg shadow-lg border border-gray-300"
                >
                  {/* Testimonial Card */}
                  <div className="flex items-center justify-center">
                    <Image
                      src={testimonial.img}
                      alt={testimonial.name}
                      width={80}
                      height={80}
                      className="rounded-full"
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <h3 className="text-lg font-semibold">
                      {testimonial.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-2">
                      {testimonial.content}
                    </p>
                    <div className="flex justify-center gap-2 mt-4 text-indigo-500"></div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
