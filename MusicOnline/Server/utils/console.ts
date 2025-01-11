export default class Console {
    private listeners = new Array<{command: string, listener: (args?: Array<string>) => void}>()
    private anyListener = ()=>{}

    async listen() {
        for await (const line of console) {
            let found = false
            const args = line.toLowerCase().split(" ")
            const name = args.shift()

            for (const { command, listener } of this.listeners) {
                if (command != name) continue
                found = true
                listener(args)
                break
            }
            if(!found){
                this.anyListener()
            }
        }
    }

    async on(command: string, listener: (args?: Array<string>) => void) {
        if(command == "any") {this.anyListener = listener; return}
        this.listeners.push({ command, listener })
    }
}