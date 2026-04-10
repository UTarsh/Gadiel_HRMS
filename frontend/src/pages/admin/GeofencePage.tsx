import { useState } from 'react'

export function GeofencePage() {
  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-[#1A1A2E] font-bold font-display text-lg">Geofence Management</h3>
            <p className="text-[11px] text-[#6B7280]">Set and manage location boundaries for attendance tracking.</p>
          </div>
          <button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold py-2 px-4 rounded-xl transition text-xs flex items-center gap-1.5 shadow-md">
            <span className="material-symbols-outlined text-[16px]">add</span> New Zone
          </button>
        </div>

        {/* 3-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: List */}
          <div className="lg:col-span-4 space-y-4">
             {[
               {name:'Gadel Technologies - Delhi Office', loc:'DLF Cyber City, Gurugram, Haryana 122002', rad:'300m', stat:'Active'},
               {name:'Wave Office', loc:'Koramangala, Bengaluru, Karnataka 560034', rad:'250m', stat:'Active'},
               {name:'Bangalore Office', loc:'Whitefield, Bengaluru, Karnataka 560066', rad:'400m', stat:'Inactive'},
             ].map((z,i) => (
               <div key={i} className={`p-4 rounded-[16px] border ${z.stat==='Active' ? 'border-[#3B82F6] bg-[#EFF6FF]/30':'border-[#E2E8F0]'} flex gap-3 relative`}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{backgroundColor: z.stat==='Active'?'#3B82F6':'#9CA3AF', color:'#fff'}}>
                    <span className="material-symbols-outlined text-[18px]">location_on</span>
                  </div>
                  <div className="flex-1 pr-12">
                    <div className="flex gap-2 items-center mb-1">
                       <p className="text-xs font-bold text-[#1A1A2E]">{z.name}</p>
                       <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${z.stat==='Active'?'bg-[#DCFCE7] text-[#16A34A]':'bg-[#F1F5F9] text-[#64748B]'}`}>{z.stat}</span>
                    </div>
                    <p className="text-[9px] text-[#6B7280] mb-1">{z.loc}</p>
                    <p className="text-[10px] font-bold text-[#4B5563]">Radius: {z.rad}</p>
                  </div>
                  <div className="absolute top-4 right-4 flex gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#9CA3AF] cursor-pointer hover:text-[#3B82F6]">edit</span>
                    <span className="material-symbols-outlined text-[16px] text-[#9CA3AF] cursor-pointer hover:text-[#EF4444]">delete</span>
                  </div>
               </div>
             ))}
          </div>

          {/* Middle Column: Map Mock */}
          <div className="lg:col-span-4 rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden relative min-h-[400px]">
             {/* Map Background Grid Simulation */}
             <div className="absolute inset-0" style={{backgroundImage: 'linear-gradient(#E2E8F0 1px, transparent 1px), linear-gradient(90deg, #E2E8F0 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.5}}></div>
             
             {/* Map controls */}
             <div className="absolute top-4 left-4 bg-white rounded-lg shadow border border-[#E2E8F0] flex overflow-hidden text-[10px] font-bold">
               <div className="px-3 py-1.5 bg-gray-100 cursor-pointer border-r">Map</div>
               <div className="px-3 py-1.5 text-gray-400 cursor-pointer">Satellite</div>
             </div>
             <div className="absolute top-4 right-4 bg-white rounded-lg shadow border border-[#E2E8F0] flex items-center px-2 py-1.5 gap-2 w-48">
               <span className="material-symbols-outlined text-[16px] text-gray-400">search</span>
               <input placeholder="Search location..." className="text-[10px] outline-none w-full" />
             </div>
             
             {/* Geofence Overlay */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-2 border-[#3B82F6] bg-[#3B82F6]/10 flex items-center justify-center">
               <div className="w-8 h-8 flex items-center justify-center justify-center font-bold">
                 <span className="material-symbols-outlined text-[32px] text-[#3B82F6]">location_on</span>
               </div>
             </div>

             <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-white rounded-lg shadow border border-[#E2E8F0] overflow-hidden p-0.5">
               <button className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 text-gray-600"><span className="material-symbols-outlined text-[14px]">add</span></button>
               <div className="w-full h-px bg-gray-200"></div>
               <button className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 text-gray-600"><span className="material-symbols-outlined text-[14px]">remove</span></button>
             </div>
          </div>

          {/* Right Column: Zone Details */}
          <div className="lg:col-span-4 space-y-6">
             <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[16px] p-5">
               <h4 className="text-xs font-bold text-[#1A1A2E] mb-4">Zone Details</h4>
               
               <div className="space-y-4 text-xs">
                 <div>
                   <p className="text-[10px] font-bold text-gray-500 mb-1 pointer-events-none">Zone Name</p>
                   <input className="w-full border border-gray-200 rounded-lg p-2 bg-white outline-none" value="Gadel Technologies - Delhi Office" readOnly/>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-gray-500 mb-1">Location</p>
                   <input className="w-full border border-gray-200 rounded-lg p-2 bg-white outline-none" value="DLF Cyber City, Gurugram, Haryana 122002" readOnly/>
                 </div>
                 <div>
                   <div className="flex justify-between items-center mb-1">
                     <p className="text-[10px] font-bold text-gray-500">Radius (meters)</p>
                     <p className="text-[10px] font-extrabold text-[#1A1A2E]">300 m</p>
                   </div>
                   <input type="range" min="50" max="1000" value="300" readOnly className="w-full accent-[#3B82F6]" />
                 </div>
                 
                 <div>
                   <p className="text-[10px] font-bold text-gray-500 mb-2">Zone Status</p>
                   <div className="flex gap-3 text-[10px] font-bold">
                     <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked readOnly className="accent-[#16A34A]"/> <span className="text-[#16A34A]">Active</span></label>
                     <label className="flex items-center gap-1 cursor-pointer"><input type="radio" readOnly className="accent-gray-400"/> <span className="text-gray-500">Inactive</span></label>
                   </div>
                 </div>

                 <div>
                   <p className="text-[10px] font-bold text-gray-500 mb-2">Allowed Time Window</p>
                   <div className="flex items-center gap-2">
                     <span className="text-gray-500 text-[10px]">Before</span>
                     <select className="border border-gray-200 rounded-lg p-1.5 bg-white outline-none text-[10px]"><option>30 mins</option></select>
                     <span className="text-gray-500 text-[10px]">After</span>
                     <select className="border border-gray-200 rounded-lg p-1.5 bg-white outline-none text-[10px]"><option>30 mins</option></select>
                   </div>
                 </div>

                 <button className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold py-2.5 rounded-lg transition text-xs flex justify-center items-center shadow-md mt-6">
                   Update Zone
                 </button>
               </div>
             </div>

             <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[16px] p-5">
               <h4 className="text-xs font-bold text-[#1A1A2E] mb-4">How It Works</h4>
               <div className="space-y-4">
                  {[
                    {i:'add_location', t:'Set Zone', d:'Define the safe location boundary on the map.'},
                    {i:'gps_fixed', t:'Punch In/Out', d:'Employees can only punch in/out within the zone and time window.'},
                    {i:'history', t:'Track & Report', d:'View compliance and exceptions in reports.'},
                  ].map((s,i) => (
                    <div key={i} className="flex gap-3 relative z-10">
                      <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#3B82F6] shrink-0 relative mt-0.5">
                         <span className="material-symbols-outlined text-[16px]">{s.i}</span>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#1A1A2E] leading-tight mb-0.5">{s.t}</p>
                        <p className="text-[9px] text-gray-500 leading-tight">{s.d}</p>
                      </div>
                    </div>
                  ))}
               </div>
               <button className="w-full border border-gray-300 bg-white text-[#4B5563] font-bold py-2 rounded-lg transition text-xs mt-4 hover:bg-gray-50">
                 Learn More
               </button>
             </div>

          </div>

        </div>

      </div>
    </div>
  )
}
