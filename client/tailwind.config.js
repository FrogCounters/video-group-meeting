/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{js,jsx,ts,tsx}"],
	theme: {
		extend: {
			keyframes: {
				blinking: {
					"0%": { backgroundColor: "red" },
					"100%": { backgroundColor: "pink" },
				},
				blinking1: {
					"0%": { backgroundColor: "pink" },
					"100%": { backgroundColor: "red" },
				},
				animationDuration: {
					"200ms": "200ms",
				},
				animationDelay: {
					"200ms": "200ms",
				},
			},
		},
	},
	plugins: [],
};
