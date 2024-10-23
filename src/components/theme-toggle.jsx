// eslint-disable-next-line no-unused-vars
import React, { useContext } from 'react';
import { FaSun, FaMoon } from 'react-icons/fa';
import { ThemeContext } from '../theme-context';

export default function ThemeToggle() {
  const { isDark, setIsDark } = useContext(ThemeContext);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-3 rounded-full bg-opacity-20 backdrop-blur-lg bg-gray-800 dark:bg-gray-200 text-yellow-400 dark:text-gray-800 transition-all duration-300 hover:shadow-lg hover:scale-105 border border-gray-700 dark:border-gray-300"
    >
      {isDark ? <FaSun size={24} /> : <FaMoon size={24} />}
    </button>
  );
}