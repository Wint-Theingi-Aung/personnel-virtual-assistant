import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// Globals from CDN
declare const marked: any;
declare const pdfjsLib: any;

interface Message {
    sender: 'user' | 'bot';
    text: string;
}

const App = () => {
    const [pdfText, setPdfText] = useState<string>('');
    const [fileName, setFileName] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isProcessingPdf, setIsProcessingPdf] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setIsProcessingPdf(true);
        setError('');
        setPdfText('');
        setMessages([
            { sender: 'bot', text: `"'${file.name}'" ကို စတင်ဖတ်ရှုနေပါသည်။ ခေတ္တစောင့်ဆိုင်းပေးပါ။` }
        ]);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const typedarray = new Uint8Array(arrayBuffer);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((s: any) => s.str).join(' ');
                fullText += `--- စာမျက်နှာ ${i} ---\n${pageText}\n\n`;
            }
            setPdfText(fullText);
            setMessages(prev => [...prev, { sender: 'bot', text: 'စာရွက်စာတမ်းကို အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။ မေးခွန်းများ စတင်မေးမြန်းနိုင်ပါပြီ။' }]);
        } catch (e) {
            setError('PDF ဖိုင်ကို ဖတ်ရာတွင် အမှားအယွင်း ဖြစ်ပွားပါသည်။ ကျေးဇူးပြု၍ ဖိုင်အမျိုးအစား မှန်ကန်မှုရှိမရှိ စစ်ဆေးပါ။');
            setMessages([]);
            console.error(e);
        } finally {
            setIsProcessingPdf(false);
            if(event.target) event.target.value = ''; // Allow re-uploading the same file
        }
    };
    
    const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
        if (e) e.preventDefault();
        if (!userInput.trim() || isLoading || isProcessingPdf) return;

        const userMessage: Message = { sender: 'user', text: userInput };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = userInput;
        setUserInput('');
        setIsLoading(true);
        setError('');

        try {
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
            const systemInstruction = `Role: သင်သည် ရန်ကုန်မြို့တော် စည်ပင်သာယာရေးကော်မတီ (YCDC) ၏ Assistant Partner ဖြစ်သည်။ ဝန်ထမ်းများ၏ မေးခွန်းများကို ပေးထားသော PDF စာအုပ်ပါ အချက်အလက်များကိုသာ အခြေခံ၍ မြန်မာဘာသာ (Unicode) ဖြင့် ဖြေကြားပေးရန် ဖြစ်သည်။

Strict Rules (တင်းကြပ်စွာ လိုက်နာရန်):
၁။ Source Material Only: ပေးထားသော အောက်ပါ စာရွက်စာတမ်းများထဲတွင် ပါရှိသည့် အချက်အလက်များကိုသာ ၁၀၀% ကိုးကား၍ ဖြေဆိုပါ။ သင်၏ ကိုယ်ပိုင်ဗဟုသုတ (General Knowledge) သို့မဟုတ် ပြင်ပအချက်အလက်များကို လုံးဝ (လုံးဝ) အသုံးမပြုပါနှင့်။
၂။ Out of Scope: အကယ်၍ မေးမြန်းချက်သည် စာရွက်စာတမ်းများထဲတွင် မပါရှိပါက ခန့်မှန်းဖြေဆိုခြင်း လုံးဝမပြုဘဲ "ဤအချက်အလက်သည် ထည့်သွင်းထားသည့် စာရွက်စာတမ်းများတွင် မပါရှိပါသဖြင့် ဖြေကြားပေး၍မရနိုင်ပါ။" ဟုသာ ယဉ်ကျေးစွာ အကြောင်းပြန်ပါ။
၃။ Citations: အဖြေတစ်ခုစီ၏ နောက်ဆုံးတွင် မည်သည့်စာမျက်နှာ (Page Number) မှ ကိုးကားထားသည်ကို တိကျစွာ ထည့်သွင်းဖော်ပြပါ။ စာမျက်နှာကို ဤ format ဖြင့်ရေးပါ \`(ကိုးကား - စာမျက်နှာ X)\`။
၄။ Tone & Language: ရုံးသုံးမြန်မာစာကို အသုံးပြု၍ တည်ကြည်ယဉ်ကျေးစွာ ဖြေဆိုပါ။ 'လူကြီးမင်း' နှင့် 'ကျွန်တော်/ကျွန်မ' ကဲ့သို့သော အသုံးအနှုန်းများကို သုံးပါ။
၅။ Formatting: အဖြေများကို စာပိုဒ်ရှည်ကြီးများဖြင့် မဖြေဘဲ Bullet Points (•) များ အသုံးပြု၍ တစ်ချက်ချင်း စနစ်တကျ ခွဲခြားဖော်ပြပါ။
၆။ Clarification: မေးခွန်းသည် မရှင်းလင်းပါက သို့မဟုတ် လိုအပ်ချက်ရှိပါက ဆက်စပ်မေးခွန်းများ ပြန်လည်မေးမြန်း၍ အသေးစိတ်ကို အတည်ပြုပါ။
၇။ Closing: အဖြေတိုင်း၏ အဆုံးတွင် "နောက်ထပ် ဘာများ ကူညီပေးရမလဲ။" ဟူသော စာသားကို အမြဲထည့်သွင်းပါ။

--- စာရွက်စာတမ်းများ ---
${pdfText}
--- စာရွက်စာတမ်းများ အဆုံး ---`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: currentInput,
                config: {
                    systemInstruction: systemInstruction,
                },
            });

            const botResponse = response.text || "တောင်းပန်ပါသည်။ တုံ့ပြန်မှုတစ်ခု ရယူနိုင်ခြင်း မရှိပါ။";
            const botMessage: Message = { sender: 'bot', text: botResponse };
            setMessages(prev => [...prev, botMessage]);

        } catch (e) {
            console.error(e);
            const errorMessage = 'API နှင့် ချိတ်ဆက်ရာတွင် အမှားအယွင်း ဖြစ်ပွားပါသည်။ နောက်တစ်ကြိမ် ထပ်မံကြိုးစားပေးပါ။';
            setError(errorMessage);
            const botMessage: Message = { sender: 'bot', text: errorMessage };
            setMessages(prev => [...prev, botMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    return (
        <>
            <header className="app-header">
                သိလိုရာမေး
            </header>
            <div className="app-container">
                <div ref={chatContainerRef} className="chat-container">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.sender}`} aria-live="polite">
                            <div dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}></div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="message bot" aria-label="Bot is typing">
                            <div className="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="input-area-wrapper">
                    {error && <div className="error-message">{error}</div>}

                    {!pdfText && !isProcessingPdf && (
                         <div className="file-upload-container">
                            <p>စတင်ရန်အတွက်၊ ကျေးဇူးပြု၍ အချက်အလက်များပါဝင်သော PDF ဖိုင်ကို ထည့်သွင်းပါ။</p>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                aria-label="Upload PDF file"
                            />
                            <button onClick={triggerFileUpload} className="file-upload-button">
                                PDF ဖိုင် ရွေးချယ်ပါ
                            </button>
                        </div>
                    )}
                    {isProcessingPdf && <div className="loading-indicator">PDF ဖိုင်ကို စိစစ်နေပါသည်...</div>}

                    {pdfText && !isProcessingPdf && (
                        <form className="input-area" onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="မေးခွန်းတစ်ခု မေးပါ..."
                                aria-label="Your message"
                                disabled={isLoading}
                            />
                            <button type="submit" disabled={isLoading || !userInput.trim()}>
                                ပို့ရန်
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
