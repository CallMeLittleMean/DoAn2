import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Home(){
  const [profile,setProfile] = useState(null)
  const nav = useNavigate()
  const userId = localStorage.getItem('userId')

  // settings state
  const [numQuestions, setNumQuestions] = useState(() => localStorage.getItem('numQuestions') || '10')
  const [bgEnabled, setBgEnabled] = useState(() => localStorage.getItem('bgMusicEnabled') === 'true')
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('soundEnabled') === 'true')
  const [timerMode, setTimerMode] = useState(() => localStorage.getItem('timerMode') || 'whole')
  const [wholeTime, setWholeTime] = useState(() => localStorage.getItem('wholeTime') || '300')
  const [perqTime, setPerqTime] = useState(() => localStorage.getItem('perQuestionTime') || '10')
  const bgAudioRef = useRef(null)

  useEffect(()=>{
    if(!userId) { nav('/login'); return }
    fetch(`/api/profile/${userId}`).then(r=>r.json()).then(setProfile).catch(()=>{})
  },[])

  useEffect(()=>{
    document.body.classList.add('home-body')
    return () => { document.body.classList.remove('home-body') }
  }, [])

  // sync localStorage when settings change
  useEffect(()=>{ localStorage.setItem('numQuestions', String(numQuestions)) }, [numQuestions])
  useEffect(()=>{ localStorage.setItem('bgMusicEnabled', bgEnabled ? 'true' : 'false') }, [bgEnabled])
  useEffect(()=>{ localStorage.setItem('soundEnabled', soundEnabled ? 'true' : 'false') }, [soundEnabled])
  useEffect(()=>{ localStorage.setItem('timerMode', timerMode) }, [timerMode])
  useEffect(()=>{ localStorage.setItem('wholeTime', wholeTime) }, [wholeTime])
  useEffect(()=>{ localStorage.setItem('perQuestionTime', perqTime) }, [perqTime])

  // background audio control
  useEffect(()=>{
    const el = bgAudioRef.current
    if(!el) return
    if(bgEnabled){
      el.play().catch(()=>{
        // autoplay blocked
        setBgEnabled(false)
        localStorage.setItem('bgMusicEnabled','false')
      })
    } else {
      el.pause(); el.currentTime = 0
    }
  }, [bgEnabled])

  // sync bg setting across tabs
  useEffect(()=>{
    function onStorage(e){
      if(e.key === 'bgMusicEnabled') setBgEnabled(e.newValue === 'true')
      if(e.key === 'soundEnabled') setSoundEnabled(e.newValue === 'true')
    }
    window.addEventListener('storage', onStorage)
    return ()=> window.removeEventListener('storage', onStorage)
  }, [])

  async function startQuiz(){
    // validate against backend pool size
    try{
      const res = await fetch('/api/questions?all=true')
      if(!res.ok) throw new Error('Network error')
      const data = await res.json()
      if(!Array.isArray(data) || data.length === 0){
        alert('Không có câu hỏi trong ngân hàng')
        return
      }
      const requested = parseInt(numQuestions, 10) || 0
      if(requested > 0 && requested > data.length){
        alert('Số câu chọn lớn hơn số câu có trong ngân hàng')
        return
      }
      // persist and navigate
      localStorage.setItem('numQuestions', String(numQuestions))
      nav('/quiz')
    }catch(e){
      console.error('Error validating questions', e)
      alert('Không thể kiểm tra ngân hàng câu hỏi. Vui lòng thử lại.')
    }
  }

  return (
    <div>
      <div style={{display:'flex',gap:24,alignItems:'flex-start',flexWrap:'wrap',justifyContent:'center',width:'100%'}}>
        <div className="home-card" style={{backgroundColor:'#ffffff',padding:36,borderRadius:18,boxShadow:'0 12px 24px rgba(0,0,0,0.15)',width:820,maxWidth:500,textAlign:'center'}}>
          <h2>Chào mừng đến với Quiz App!</h2>
          <img id="avatar" className="avatar" src={profile?.avatar||''} alt="Avatar người dùng" />
          <div className="info">
            <p><strong>Tên:</strong> <span id="display-name">{profile?.displayName}</span></p>
            <p><strong>Điểm cao nhất:</strong> <span id="high-score">{profile?.highScore||0}</span></p>
          </div>

          <label htmlFor="num-questions">Số câu hỏi:</label>
          <select id="num-questions" value={numQuestions} onChange={e=>setNumQuestions(e.target.value)}>
            <option value="5">5 câu</option>
            <option value="10">10 câu</option>
            <option value="15">15 câu</option>
            <option value="20">20 câu</option>
          </select>

          <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:12}}>
            <button onClick={startQuiz} style={{width:'100%',padding:12,background:'#4caf50',color:'#fff',border:'none',borderRadius:8}}>Bắt đầu Quiz</button>
            <button onClick={()=>nav('/add-question')} style={{width:'100%',padding:12,background:'#4caf50',color:'#fff',border:'none',borderRadius:8}}>Thêm câu hỏi</button>
          </div>
        </div>

        <div className="settings-panel" style={{background:'#fff',padding:30,borderRadius:16,boxShadow:'0 12px 24px rgba(0,0,0,0.15)'}}>
          <h3 style={{textAlign:'center',marginTop:0}}>Cài đặt</h3>
          <div style={{textAlign:'center',marginBottom:12,display:'flex',flexDirection:'column',gap:8,alignItems:'center'}}>
            <a href="#" onClick={()=>nav('/profile')} className="edit-link">Chỉnh sửa hồ sơ</a>
            <button className="logout-btn" onClick={()=>{ localStorage.removeItem('userId'); nav('/login') }} style={{width:'80%'}}>Đăng xuất</button>
          </div>

          <div style={{marginBottom:12,textAlign:'left'}}>
            <label style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer'}}>
              <span style={{fontWeight:600}}>Phát nhạc nền</span>
              <div className="switch" style={{marginLeft:'auto'}}>
                <input type="checkbox" id="bg-switch" checked={bgEnabled} onChange={e=>setBgEnabled(e.target.checked)} />
                <label htmlFor="bg-switch" className="slider"></label>
              </div>
            </label>
            <audio ref={bgAudioRef} id="bg-music-audio" src="/sound/background_music.mp3" preload="auto" loop></audio>
          </div>

          <div style={{marginBottom:12, textAlign:'left'}}>
            <label style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer'}}>
              <span style={{fontWeight:600}}>Phát âm thanh khi chọn đáp án</span>
              <div className="switch" style={{marginLeft:'auto'}}>
                <input type="checkbox" id="sound-switch" checked={soundEnabled} onChange={e=>setSoundEnabled(e.target.checked)} />
                <label htmlFor="sound-switch" className="slider"></label>
              </div>
            </label>
          </div>

          <div style={{marginBottom:12, textAlign:'left', display:'flex', gap:12, alignItems:'center'}}>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <div style={{fontWeight:600}}>Chế độ Timer</div>
              <div style={{display:'flex',gap:8}}>
                <button id="mode-whole" className={`mode-btn ${timerMode==='whole'?'active':''}`} onClick={()=>setTimerMode('whole')}>Timer cả bài</button>
                <button id="mode-perq" className={`mode-btn ${timerMode==='perq'?'active':''}`} onClick={()=>setTimerMode('perq')}>Timer từng câu</button>
              </div>
            </div>
            <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
              <div style={{display:'flex',flexDirection:'column'}}>
                <label htmlFor="whole-time">Thời gian cả bài</label>
                <select id="whole-time" value={wholeTime} onChange={e=>setWholeTime(e.target.value)}>
                  <option value="60">1 phút</option>
                  <option value="120">2 phút</option>
                  <option value="300">5 phút</option>
                  <option value="600">10 phút</option>
                </select>
              </div>
              <div style={{display:'flex',flexDirection:'column'}}>
                <label htmlFor="perq-time">Thời gian mỗi câu</label>
                <select id="perq-time" value={perqTime} onChange={e=>setPerqTime(e.target.value)}>
                  <option value="5">5 giây</option>
                  <option value="10">10 giây</option>
                  <option value="15">15 giây</option>
                  <option value="20">20 giây</option>
                  <option value="25">25 giây</option>
                  <option value="30">30 giây</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="toast-container" style={{position:'fixed',top:20,right:20,zIndex:9999}}></div>
    </div>
  )
}
