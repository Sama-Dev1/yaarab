using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace NeonStrike.Server.Hubs
{
    public class GameHub : Hub
    {
        // Broadcasts player movement to all other clients
        public async Task SendPlayerMove(float x, float y, bool isAttacking, string playerName)
        {
            await Clients.Others.SendAsync("ReceivePlayerUpdate", playerName, x, y, isAttacking);
        }

        // Handles game start synchronization
        public async Task StartGame(string roomName)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, roomName);
            await Clients.Group(roomName).SendAsync("GameStarting");
        }

        // Handles damage events calculated on client or server
        public async Task PlayerHit(string targetPlayerName, float damage)
        {
            await Clients.All.SendAsync("UpdateHealth", targetPlayerName, damage);
        }

        public override async Task OnConnectedAsync()
        {
            // C# Logic for logging connection
            System.Console.WriteLine($"Player Connected: {Context.ConnectionId}");
            await base.OnConnectedAsync();
        }
    }
}
