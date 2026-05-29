package com.kimanh.crm.repository;

import com.kimanh.crm.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    List<User> findByRoleAndActiveTrue(String role);

    // Login: find by username OR fullName (single query, safe with duplicates, TRIM for safety)
    @Query("SELECT u FROM User u WHERE TRIM(u.username) = TRIM(:login) OR TRIM(u.fullName) = TRIM(:login) ORDER BY u.id ASC")
    List<User> findByUsernameOrFullName(@Param("login") String login);
}
