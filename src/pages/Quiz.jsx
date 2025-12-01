import React, { useEffect, useState, useRef } from 'react'
import { useToast } from '../components/ToastProvider'

function shuffleArray(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function Quiz(){
  const [questions, setQuestions] = useState(null)
  const [error, setError] = useState('')
  const [prepared, setPrepared] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedValue, setSelectedValue] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [wrongAnswers, setWrongAnswers] = useState([])
  const [quizFinished, setQuizFinished] = useState(false)

  const totalTimerRef = useRef(null)
  const perqTimerRef = useRef(null)
  const perqTimeoutRef = useRef(null)
  const perqDisplayIntervalRef = useRef(null)
  const [totalTimeLeft, setTotalTimeLeft] = useState(0)
  const [perqTimeLeft, setPerqTimeLeft] = useState(0)
  const quizStartTimeRef = useRef(null)

  const soundCorrectRef = useRef(null)
  const soundWrongRef = useRef(null)
  const bgAudioRef = useRef(null)

  let toast = () => {}
  try{
    toast = useToast()
  }catch(e){
    // if ToastProvider isn't available for some reason, fall back to console
    console.error('useToast not available in Quiz:', e)
    toast = (msg, type) => { console.log('[toast]', type, msg) }
  }

  useEffect(()=>{
    fetch('/api/questions?all=true')
      .then(r=>r.json())
      .then(data=>{
        if(!Array.isArray(data)) return setError('Invalid data')
        setQuestions(data)
      })
      .catch(e=>setError('Could not load questions'))
  }, [])

  useEffect(()=>{
    console.log('Quiz mounted')
    document.body.classList.add('quiz-body')
    return () => { document.body.classList.remove('quiz-body') }
  }, [])

    // Initialize background music and sound toggles (sync across tabs)
    useEffect(()=>{
      const BGM_KEY = 'bgMusicEnabled'
      const SOUND_KEY = 'soundEnabled'
      const bgAudio = bgAudioRef.current
      if(!bgAudio) return
      const enabled = localStorage.getItem(BGM_KEY) === 'true'
      if(enabled){ bgAudio.play().catch(()=>{}) }

      function onStorage(ev){
        if(ev.key === BGM_KEY){
          const val = ev.newValue === 'true'
          if(val) bgAudio.play().catch(()=>{});
          else { bgAudio.pause(); bgAudio.currentTime = 0 }
        }
        // soundEnabled handled at play time in checkAnswer
      }
      window.addEventListener('storage', onStorage)
      return ()=> window.removeEventListener('storage', onStorage)
    }, [bgAudioRef.current])

    // If autoplay was blocked, try to play on first user interaction when bg music enabled
    useEffect(()=>{
      const BGM_KEY = 'bgMusicEnabled'
      const bgAudio = bgAudioRef.current
      if(!bgAudio) return
      if(localStorage.getItem(BGM_KEY) === 'true'){
        const tryPlay = () => {
          bgAudio.play().then(()=>{
            window.removeEventListener('click', tryPlay)
          }).catch(()=>{
            // still blocked, leave the listener
          })
        }
        window.addEventListener('click', tryPlay)
        return ()=> window.removeEventListener('click', tryPlay)
      }
    }, [bgAudioRef.current])

  // prepare questions when questions loaded
  useEffect(()=>{
    if(!questions) return
    const requested = parseInt(localStorage.getItem('numQuestions') || '0', 10) || 0
    let pool = questions.slice()
    shuffleArray(pool)
    if(requested && requested > 0 && requested < pool.length) pool = pool.slice(0, requested)

    // prepare shuffled options
    pool = pool.map(q => {
      const opts = []
      if(q.type === 'true_false'){
        opts.push({ value: 'true', text: 'Đúng', isCorrect: String(q.correctAnswer) === 'true', displayLabel: '' })
        opts.push({ value: 'false', text: 'Sai', isCorrect: String(q.correctAnswer) === 'false', displayLabel: '' })
      } else {
        for(let i=0;i<(q.options||[]).length;i++){
          const label = String.fromCharCode(65+i)
          opts.push({ value: label, text: q.options[i], isCorrect: label === q.correctAnswer, displayLabel: label })
        }
      }
      shuffleArray(opts)
      const correctOpt = opts.find(o=>o.isCorrect)
      return { ...q, _shuffledOptions: opts, correctAnswer: correctOpt ? correctOpt.value : q.correctAnswer }
    })

    setPrepared(pool)
    setCurrentIndex(0)
    setScore(0)
    setWrongAnswers([])
    setAnsweredCount(0)
    setQuizFinished(false)
    setSelectedValue(null)
    quizStartTimeRef.current = Date.now()
    // reset timers
    setTotalTimeLeft(0)
    clearInterval(totalTimerRef.current); totalTimerRef.current = null
    clearInterval(perqTimerRef.current); perqTimerRef.current = null
  }, [questions])

  // timer control
  function startTimerForQuestion(){
    const mode = localStorage.getItem('timerMode') || 'whole'
    const perq = parseInt(localStorage.getItem('perQuestionTime') || '10', 10)
    const whole = parseInt(localStorage.getItem('wholeTime') || '300', 10)

    // clear existing
    if(perqTimerRef.current){ clearInterval(perqTimerRef.current); perqTimerRef.current = null }
    if(mode === 'whole'){
      if(!totalTimeLeft) setTotalTimeLeft(whole)
      if(!totalTimerRef.current){
        totalTimerRef.current = setInterval(()=>{
          setTotalTimeLeft(t=>{
            const nt = t-1
            if(nt <= 0){ clearInterval(totalTimerRef.current); totalTimerRef.current = null; finishQuiz() }
            return nt
          })
        }, 1000)
      }
    } else {
      // per-question timer: use a single timeout to trigger autoNext, and a separate interval to update display
      // clear any previous
      if(perqTimeoutRef.current){ clearTimeout(perqTimeoutRef.current); perqTimeoutRef.current = null }
      if(perqDisplayIntervalRef.current){ clearInterval(perqDisplayIntervalRef.current); perqDisplayIntervalRef.current = null }

      setPerqTimeLeft(perq)
      // timeout to automatically advance (only once)
      perqTimeoutRef.current = setTimeout(()=>{
        perqTimeoutRef.current = null
        autoNextQuestion()
      }, perq * 1000)

      // interval to update visible countdown every second
      perqDisplayIntervalRef.current = setInterval(()=>{
        setPerqTimeLeft(t => {
          const nt = t - 1
          return nt >= 0 ? nt : 0
        })
      }, 1000)
    }
  }

  function stopAllTimers(){
    if(perqTimerRef.current){ clearInterval(perqTimerRef.current); perqTimerRef.current = null }
    if(perqTimeoutRef.current){ clearTimeout(perqTimeoutRef.current); perqTimeoutRef.current = null }
    if(perqDisplayIntervalRef.current){ clearInterval(perqDisplayIntervalRef.current); perqDisplayIntervalRef.current = null }
    if(totalTimerRef.current){ clearInterval(totalTimerRef.current); totalTimerRef.current = null }
  }

  // when prepared changes or currentIndex changes, start timer
  useEffect(()=>{
    if(!prepared || prepared.length === 0) return
    // reset selection
    setSelectedValue(null)
    setRevealed(false)
    startTimerForQuestion()
    return ()=>{
      if(perqTimerRef.current){ clearInterval(perqTimerRef.current); perqTimerRef.current = null }
      if(perqTimeoutRef.current){ clearTimeout(perqTimeoutRef.current); perqTimeoutRef.current = null }
      if(perqDisplayIntervalRef.current){ clearInterval(perqDisplayIntervalRef.current); perqDisplayIntervalRef.current = null }
    }
  }, [prepared, currentIndex])

  function checkAnswer(){
    const q = prepared[currentIndex]
    if(!q) return
    const selected = selectedValue
    // reveal correct answer for this question
    setRevealed(true)

    if(selected === q.correctAnswer){
      setScore(s=>s+10)
      try{ if(localStorage.getItem('soundEnabled')==='true' && soundCorrectRef.current){ soundCorrectRef.current.currentTime = 0; soundCorrectRef.current.play() } }catch(e){}
      toast('Đúng! Bạn được 10 điểm.', 'success')
      if(selected) setAnsweredCount(c=>c+1)
    } else {
      try{ if(localStorage.getItem('soundEnabled')==='true' && soundWrongRef.current){ soundWrongRef.current.currentTime = 0; soundWrongRef.current.play() } }catch(e){}
      toast(`Đáp án đúng là ${q.correctAnswer}.`, 'error')
      setWrongAnswers(w => [...w, { question: q.questionText, selected, correct: q.correctAnswer, options: q._shuffledOptions || [] }])
      if(selected) setAnsweredCount(c=>c+1)
    }
  }

  function nextQuestion(){
    if(currentIndex >= prepared.length - 1){
      checkAnswer()
      // show reveal then finish
      setTimeout(()=>{
        finishQuiz()
      }, 1000)
      return
    }
    stopAllTimers()
    checkAnswer()
    // wait for 1s to show reveal then advance
    setTimeout(()=>{
      setCurrentIndex(i=>i+1)
      setSelectedValue(null)
      setRevealed(false)
    }, 1000)
  }

  function autoNextQuestion(){
    toast('Hết giờ! Tự chuyển câu tiếp theo.', 'info')
    checkAnswer()
    if(currentIndex >= prepared.length - 1){
      setTimeout(()=> finishQuiz(), 1000)
      return
    }
    setTimeout(()=>{
      setCurrentIndex(i=>i+1)
      setSelectedValue(null)
      setRevealed(false)
    }, 1000)
  }

  async function finishQuiz(){
    stopAllTimers()
    setQuizFinished(true)
    // update high score if needed
    const userId = localStorage.getItem('userId')
    if(!userId) return
    try{
      const res = await fetch(`/api/profile/${userId}`)
      if(res.ok){
        const user = await res.json()
        if(score > (user.highScore || 0)){
          await fetch(`/api/profile/${userId}`, { method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ highScore: score }) })
        }
      }
    }catch(e){ /* ignore */ }
  }

  if(error) return <div className="page">{error}</div>
  if(!prepared || prepared.length === 0) return <div className="page">Loading quiz...</div>

  const q = prepared[currentIndex]

  return (
    <div>
      <div className="quiz-container bg-white p-6 rounded-xl shadow-lg w-full max-w-lg fade-in" style={{margin:24}}>
        <h3 id="question-title" className="text-xl font-semibold text-gray-800 mb-4 text-center">Câu {currentIndex+1}/{prepared.length}</h3>
        <div id="timer-display" className="timer">{(localStorage.getItem('timerMode')||'whole') === 'whole' ? `Thời gian còn lại: ${totalTimeLeft}s` : `Thời gian: ${perqTimeLeft}s`}</div>
        <div id="question-text" className="text-gray-700 mb-6">{q.questionText}</div>
        <div id="question-options" className="options space-y-3">
          { (q._shuffledOptions || []).map((opt, idx) => (
              <label key={idx} className={`flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition ${revealed ? (opt.isCorrect ? 'correct-answer' : '') : ''}`} data-correct={opt.isCorrect}>
                <input disabled={revealed} type="radio" name="answer" value={opt.value} checked={selectedValue === opt.value} onChange={()=>setSelectedValue(opt.value)} className="h-4 w-4 text-blue-600" />
                {opt.displayLabel ? opt.displayLabel + ': ' : ''}{opt.text}
              </label>
            ))}
        </div>
        <div className="flex justify-center gap-3 mt-6">
          <button onClick={nextQuestion} disabled={!selectedValue} className="btn-primary px-6 py-2 rounded-lg" style={{border:'none'}}>{currentIndex === prepared.length-1 ? 'Hoàn thành' : 'Tiếp theo'}</button>
        </div>
        <div id="score" className="text-center mt-4 text-lg font-semibold">Điểm của bạn: <span id="score-value">{score}</span></div>
        <audio ref={soundCorrectRef} id="sound-correct" src="/sound/right_answer_sound.mp3" preload="auto"></audio>
        <audio ref={soundWrongRef} id="sound-wrong" src="/sound/wrong_answer_sound_2.mp3" preload="auto"></audio>
        <audio ref={bgAudioRef} id="bg-music-audio" src="/sound/background_music.mp3" preload="auto" loop></audio>
      </div>

      {/* results modal */}
      { quizFinished && (
        <div id="results-modal" style={{display:'flex',position:'fixed',inset:0,alignItems:'center',justifyContent:'center',zIndex:10000}}>
          <div id="results-backdrop" style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.5)'}}></div>
          <div style={{position:'relative',background:'#fff',borderRadius:12,padding:18,maxWidth:720,width:'90%',zIndex:10001}}>
            <h3 style={{marginTop:0,marginBottom:8}}>Kết quả Quiz</h3>
            <div id="results-summary" style={{marginBottom:12,color:'#333'}}>
              <p><strong>Đúng:</strong> {Math.floor(score/10)}/{prepared.length}</p>
              <p><strong>Điểm:</strong> {score}</p>
            </div>
            <div id="results-wrongs" style={{maxHeight:260,overflow:'auto',marginBottom:12}}>
              {wrongAnswers.length === 0 ? <p>Tuyệt vời! Không có câu sai.</p> : wrongAnswers.map((w, idx) => (
                <div key={idx} style={{padding:8,borderBottom:'1px solid #eee'}}>
                  <strong>Câu {idx+1}:</strong> {w.question}<br/>
                  <strong>Đáp án bạn chọn:</strong> {w.selected} <strong>Đáp án đúng:</strong> {w.correct}
                </div>
              ))}
            </div>
            <div style={{textAlign:'right'}}>
              <button onClick={()=>{ setQuizFinished(false); window.location.href = '/home'; }} style={{background:'#16a34a',color:'#fff',padding:'8px 12px',borderRadius:8,border:'none',cursor:'pointer'}}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
