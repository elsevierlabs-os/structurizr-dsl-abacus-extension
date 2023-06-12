export class StringWriter {
    private value = "";

    public write(content: string): void {
        this.value += content;
    }

    public writeLine(content: string): void {
        this.write(content);
        this.newline();
    }

    public newline(): void {
        this.write("\r\n");
    }

    public toString(): string {
        return this.value;
    }
}