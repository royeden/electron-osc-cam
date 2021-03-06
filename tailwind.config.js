const GRID = Array.apply(null, Array(50)).map(
  (_, value) => String(value + 1)
);

const GRID_TEMPLATES = GRID.map(value => `repeat(${value}, minmax(0, 1fr))`)

module.exports = {
  purge: {
    content: ["./renderer/**/*.jsx"],
    options: {
      safelist: ["cssload-dots", "cssload-dot"],
    },
  },
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      borderColor: theme => ({
        ...theme('colors'),
      }),
      colors: {
        dark: {
          DEFAULT: "#121212",
          100: "#1f1f1f",
          200: "#242424",
          300: "#262626",
          300: "#292929",
          400: "#2e2e2e",
          500: "#313131",
          600: "#363636",
          700: "#383838",
          800: "#3b3b3b",
        },
        light: {
          DEFAULT: "#fafafa",
          high: "#dedede",
          medium: "#999999",
          disabled: "#616161",
        },
        primary: {
          DEFAULT: "#16231f",
          light: "#3c4b46",
          dark: "#000000",
        },
        secondary: {
          DEFAULT: "#48ff9b",
          light: "#88ffcd",
          dark: "#00cb6c",
        },
        pallete: {
          DEFAULT: "#48ff9b",
          complimentary: "#ff48ad",
          analogous: "#51ff48",
          analogous2: "#48fff6",
          error: "#ff4852",
          triadic: "#48adff",
          triadic2: "#9a48ff",
        },
      },
      boxShadow: {
        "light-md":
          "0 4px 6px -1px rgba(30, 30, 30, 0.1), 0 2px 4px -1px rgba(30, 30, 30, 0.06)",
      },
      gridColumnStart: {
        ...GRID
      },
      gridColumnEnd: {
        ...GRID
      },
      gridTemplateColumns: {
        ...GRID_TEMPLATES
      },
      gridRowStart: {
        ...GRID
      },
      gridRowEnd: {
        ...GRID
      },
      gridTemplateRows: {
        ...GRID_TEMPLATES,
      },
      scale: {
        '200': '2',
        '225': '2.25',
        '250': '2.50',
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
};
