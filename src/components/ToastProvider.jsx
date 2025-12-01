import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }){
  const [toasts, setToasts] = useState([])

  const show = useCallback((message, type='info', timeout=2000) => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message, type }])
    if (timeout > 0) setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), timeout)
  }, [])

  const value = { show }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div id="toast-container" style={{position:'fixed',top:20,right:20,zIndex:9999}}>
        {toasts.map(t => (
          <div key={t.id} className="toast-item" style={{minWidth:220, marginBottom:8, padding:'10px 14px', borderRadius:8, boxShadow:'0 6px 18px rgba(0,0,0,0.12)', color:'#fff', fontSize:14, background: t.type==='success' ? '#16a34a' : (t.type==='error' ? '#dc2626' : '#2563eb')}}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(){
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx.show
}
