const axios = require('axios');

class ServiceClient {
  constructor() {
    this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:3001';
    this.communicationServiceUrl = process.env.COMMUNICATION_SERVICE_URL || 'http://communication-service:3003';
  }

  /**
   * Get user information by ID
   * @param {string} userId - The user ID
   * @param {string} token - JWT token for authentication
   * @returns {Promise<Object>} User data
   */
  async getUserById(userId, token) {
    try {
      const response = await axios.get(`${this.userServiceUrl}/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error getting user ${userId}:`, error.message);
      throw new Error(`Failed to get user information: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get team information by ID
   * @param {number} teamId - The team ID
   * @param {string} token - JWT token for authentication
   * @returns {Promise<Object>} Team data
   */
  async getTeamById(teamId, token) {
    try {
      const response = await axios.get(`${this.userServiceUrl}/api/teams/${teamId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error getting team ${teamId}:`, error.message);
      throw new Error(`Failed to get team information: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get all players for a team
   * @param {number} teamId - The team ID
   * @param {string} token - JWT token for authentication
   * @returns {Promise<Array>} List of players
   */
  async getTeamPlayers(teamId, token) {
    try {
      const response = await axios.get(`${this.userServiceUrl}/api/teams/${teamId}/players`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error getting players for team ${teamId}:`, error.message);
      throw new Error(`Failed to get team players: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Send a notification
   * @param {Object} notification - The notification to send
   * @param {string} token - JWT token for authentication
   * @returns {Promise<Object>} Notification result
   */
  async sendNotification(notification, token) {
    try {
      const response = await axios.post(`${this.communicationServiceUrl}/api/notifications`, notification, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error sending notification:', error.message);
      throw new Error(`Failed to send notification: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Send an injury notification
   * @param {Object} injury - The injury data
   * @param {string} action - Action type (created, updated, etc.)
   * @param {Object} user - The user who performed the action
   * @param {string} token - JWT token for authentication
   * @returns {Promise<Object>} Notification result
   */
  async sendInjuryNotification(injury, action, user, token) {
    try {
      // Get player info
      const player = await this.getUserById(injury.player_id, token);
      
      const notification = {
        recipients: [injury.player_id], // Send to the injured player
        title: `Injury ${action}`,
        message: `Your injury record has been ${action}: ${injury.injury_type}`,
        type: 'medical',
        data: {
          injury_id: injury.id,
          action,
          injury_type: injury.injury_type
        },
        sender: user.id
      };
      
      // If team coach or admin should be notified
      if (player.team_id) {
        const team = await this.getTeamById(player.team_id, token);
        if (team && team.coach_id) {
          notification.recipients.push(team.coach_id);
        }
      }
      
      return this.sendNotification(notification, token);
    } catch (error) {
      console.error('Error sending injury notification:', error.message);
      // Log but don't throw - notifications shouldn't block main functionality
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a treatment notification
   * @param {Object} treatment - The treatment data
   * @param {Object} injury - The related injury
   * @param {string} action - Action type (added, updated, etc.)
   * @param {Object} user - The user who performed the action
   * @param {string} token - JWT token for authentication
   * @returns {Promise<Object>} Notification result
   */
  async sendTreatmentNotification(treatment, injury, action, user, token) {
    try {
      const notification = {
        recipients: [injury.player_id], // Send to the injured player
        title: `Treatment ${action}`,
        message: `A treatment has been ${action} for your ${injury.injury_type} injury: ${treatment.treatment_type}`,
        type: 'medical',
        data: {
          treatment_id: treatment.id,
          injury_id: injury.id,
          action,
          treatment_type: treatment.treatment_type
        },
        sender: user.id
      };
      
      return this.sendNotification(notification, token);
    } catch (error) {
      console.error('Error sending treatment notification:', error.message);
      // Log but don't throw - notifications shouldn't block main functionality
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ServiceClient();