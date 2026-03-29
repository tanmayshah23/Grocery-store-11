import { motion } from 'framer-motion';

export function QuantumLoader() {
    return (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-[#05070a]/90 backdrop-blur-2xl">
            <div className="relative w-32 h-32 flex items-center justify-center">
                {/* Core Pulsing Glow */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute inset-0 bg-emerald-600/20 rounded-full blur-3xl"
                />

                {/* Outer Rotating Ring */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="absolute inset-0 border-[1px] border-emerald-500/20 rounded-full"
                />

                {/* Middle Pulse Ring */}
                <motion.div
                    animate={{
                        scale: [0.8, 1.1, 0.8],
                        opacity: [0.2, 0.5, 0.2],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute inset-4 border-[2px] border-emerald-400/10 rounded-[2rem]"
                />

                {/* Spinning Precision Indicator */}
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="absolute inset-8 border-t-[3px] border-emerald-500 rounded-full shadow-[0_0_20px_rgba(45,138,106,0.5)]"
                />

                {/* Center Logo/Icon Placeholder */}
                <div className="relative z-10 flex flex-col items-center gap-2">
                    <motion.div
                        animate={{
                            y: [0, -4, 0],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-2xl"
                    >
                        <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                    </motion.div>
                </div>
            </div>

            {/* Loading Text with Typewriter-like animation */}
            <div className="mt-12 flex flex-col items-center gap-2">
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-white text-xs font-black tracking-[0.5em] uppercase"
                >
                    Initializing Quantum Core
                </motion.p>
                <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            animate={{
                                opacity: [0, 1, 0],
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.2,
                            }}
                            className="w-1 h-1 bg-emerald-500 rounded-full"
                        />
                    ))}
                </div>
            </div>

            {/* Atmosphere particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: 15 }).map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{
                            x: Math.random() * window.innerWidth,
                            y: Math.random() * window.innerHeight,
                            opacity: 0,
                        }}
                        animate={{
                            y: [null, Math.random() * -100],
                            opacity: [0, 0.4, 0],
                        }}
                        transition={{
                            duration: 5 + Math.random() * 5,
                            repeat: Infinity,
                            ease: "linear",
                            delay: Math.random() * 5,
                        }}
                        className="absolute w-[1px] h-[1px] bg-emerald-400"
                    />
                ))}
            </div>
        </div>
    );
}
