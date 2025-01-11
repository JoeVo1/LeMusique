export default class Stopwatch{
    start = 0
    pauseTime = 0
    addedPause = 0
    paused = true
    timeout : any
    songLength = 0
    callback : any
    constructor(_callback : any){this.callback = _callback}

    play = (_songLength : number)=>{
        this.songLength = _songLength
        this.addedPause = 0
        this.pauseTime = 0
        this.paused = false
        this.newTimeout(_songLength)
        this.start = Date.now()
    }

    pause = ()=>{
        clearTimeout(this.timeout)
        if(this.paused) return
        this.paused = true
        this.pauseTime = Date.now()
    }

    resume = () =>{
        this.newTimeout(this.songLength - this.getTime())
        this.paused = false
        this.addedPause += Date.now() - this.pauseTime
    }

    getTime = ()=>{
        if(this.paused)
            return (Date.now() - this.start - (Date.now() - this.pauseTime) - this.addedPause)
        else
            return (Date.now() - this.start - this.addedPause)
    }

    newTimeout = (delay: number) =>{
        this.timeout = setTimeout(this.callback, delay);
    }
}