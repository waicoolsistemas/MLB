<template>
  <div class="min-h-screen bg-navy-950 flex items-center justify-center px-4 relative overflow-hidden">
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cardinal-800 opacity-10 blur-[120px] rounded-full"></div>
      <div class="absolute bottom-0 right-0 w-[400px] h-[400px] bg-navy-700 opacity-20 blur-[100px] rounded-full"></div>
      <div class="absolute top-1/3 left-0 w-[300px] h-[300px] bg-gold-600 opacity-5 blur-[80px] rounded-full"></div>
    </div>

    <div class="relative w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cardinal-600 mb-4 shadow-lg shadow-cardinal-900/50">
          <svg class="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white tracking-tight">Liga de Softball</h1>
        <p class="text-gray-500 text-sm mt-1">Sistema de Administracion</p>
      </div>

      <div class="card p-8 shadow-2xl shadow-black/40">
        <slot />
      </div>

      <p class="text-center text-gray-600 text-xs mt-6">
        &copy; {{ new Date().getFullYear() }} Sistema de Administracion Liga de Softball
      </p>
    </div>
  </div>
</template>
