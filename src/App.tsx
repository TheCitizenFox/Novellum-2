/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AppProvider } from './store';
import { Layout } from './components/Layout';
import { SplashScreen } from './components/SplashScreen';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AppProvider>
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="h-full w-full"
          >
            <Layout />
          </motion.div>
        )}
      </AnimatePresence>
    </AppProvider>
  );
}
