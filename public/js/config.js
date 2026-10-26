/* Configuração do Sipah.
 *
 * supabaseUrl / supabaseKey: banco do ranking global (projeto "sipah" no Supabase).
 *   A chave "publishable" é feita para ficar no navegador: ela só consegue chamar
 *   as funções do jogo (entrar, começar e terminar corrida, ler o placar). As tabelas
 *   ficam fechadas e a pontuação é conferida pelo próprio banco.
 *
 *   Para usar SÓ o servidor local do estande (sem internet), deixe supabaseUrl vazio: ''.
 *   Se o banco não responder, o jogo também cai sozinho para o servidor local.
 *
 * publicUrl: endereço que vai no QR code do telão. Vazio = o endereço onde o telão está aberto.
 */
window.SIPAH_CONFIG = {
  supabaseUrl: 'https://aimomkrapvlujbftyilb.supabase.co',
  supabaseKey: 'sb_publishable_ysP8raD60DoWc9IofCiQeA_MBfOTzv2',
  publicUrl: ''
};
