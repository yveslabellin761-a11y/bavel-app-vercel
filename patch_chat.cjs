const fs = require('fs');
let code = fs.readFileSync('src/components/mobile/ChatConversationView.tsx', 'utf-8');

// Replace question simulation
const oldSimQuestion = `
    // Simulate a reply after 1.5s
    setTimeout(async () => {
      const replies = [
        \`J'adore ton énergie ! Tu habites de quel côté exactement ? 😊\`,
        \`Haha tu es trop marrant(e) ! Tu fais quoi de beau de ta journée ?\`,
        \`Coucou ! Oui tout va bien de mon côté, je sors tout juste du sport. Et toi ? ✨\`
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      await saveMessageToSupabase(matchId, profile.user_id || profile.id, randomReply, false);
      
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: randomReply,
        sender: 'them' as const,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered'
      }]);
    }, 1500);`;
code = code.replace(oldSimQuestion, '');

// Replace text simulation
const oldSimText = `
    // Simulate a reply after 1.5s
    setTimeout(async () => {
      const replies = [
        \`J'adore ton énergie ! Tu habites de quel côté exactement ? 😊\`,
        \`Haha tu es trop marrant(e) ! Tu fais quoi de beau de ta journée ?\`,
        \`Coucou ! Oui tout va bien de mon côté, je sors tout juste du sport. Et toi ? ✨\`
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      await saveMessageToSupabase(matchId, profile.user_id || profile.id, randomReply, false);
      
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: randomReply,
        sender: 'them',
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered'
      }]);
    }, 1500);`;
code = code.replace(oldSimText, '');

// Replace gif simulation
const oldSimGif = `
    setTimeout(async () => {
      const replies = [
        \`Haha j'adore ce GIF ! 😂\`,
        \`Trop drôle ! Tu trouves toujours les meilleurs GIFs !\`,
        \`Ahaha excellent ! ❤️\`
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      await saveMessageToSupabase(matchId, profile.user_id || profile.id, randomReply, false);
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: randomReply,
        sender: 'them',
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered'
      }]);
    }, 2000);`;
code = code.replace(oldSimGif, '');

// Replace photo simulation
const oldSimPhoto = `
    setTimeout(async () => {
      const replies = isEphemeralPhoto 
        ? [
          \`Oh une photo éphémère 👀\`,
          \`Jolie surprise ! ✨\`,
          \`Dommage qu'elle disparaisse si vite !\`
        ] 
        : [
          \`Wow, superbe photo ! 😍\`,
          \`Trop sympa la photo ! C'était où ? 📸\`,
          \`Magnifique ! Tu as un super style.\`
        ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      await saveMessageToSupabase(matchId, profile.user_id || profile.id, randomReply, false);
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: randomReply,
        sender: 'them',
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered'
      }]);
    }, 2500);`;
code = code.replace(oldSimPhoto, '');

fs.writeFileSync('src/components/mobile/ChatConversationView.tsx', code);
console.log("Patched ChatConversationView.tsx successfully.");
